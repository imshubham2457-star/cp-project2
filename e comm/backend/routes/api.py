import random
import re
import time
from datetime import datetime

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from models import (
    Address,
    CartLine,
    ContactMessage,
    NewsletterSubscriber,
    Order,
    Product,
    User,
    db,
)

api_bp = Blueprint("api", __name__)

COUPONS = {"SAVE10": 10, "WELCOME20": 20}


def _session_id():
    sid = request.headers.get("X-Session-Id") or request.headers.get("x-session-id")
    return sid.strip() if sid else None


def _product_to_dict(p: Product, include_description: bool = True):
    d = {
        "id": p.id,
        "name": p.name,
        "brand": p.brand,
        "price": p.price_inr,
        "image": p.image,
        "stock": p.stock,
        "category": p.category,
    }
    if include_description:
        d["description"] = p.description or ""
    return d


def _cart_summary(session_id: str):
    lines = CartLine.query.filter_by(session_id=session_id).all()
    items = []
    subtotal = 0
    for line in lines:
        prod = line.product
        if not prod:
            db.session.delete(line)
            continue
        line_total = prod.price_inr * line.quantity
        subtotal += line_total
        items.append(
            {
                "id": line.id,
                "product_id": prod.id,
                "quantity": line.quantity,
                "name": prod.name,
                "price": prod.price_inr,
                "image": prod.image,
            }
        )
    db.session.commit()
    return {"items": items, "subtotal": subtotal}


@api_bp.route("/products", methods=["GET"])
def list_products():
    products = Product.query.order_by(Product.id).all()
    return jsonify([_product_to_dict(p) for p in products])


@api_bp.route("/products/<int:product_id>", methods=["GET"])
def get_product(product_id: int):
    p = Product.query.get(product_id)
    if not p:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(_product_to_dict(p, include_description=True))


@api_bp.route("/cart", methods=["GET"])
def get_cart():
    sid = _session_id()
    if not sid:
        return jsonify({"items": [], "subtotal": 0})
    return jsonify(_cart_summary(sid))


@api_bp.route("/cart", methods=["POST"])
def add_cart():
    sid = _session_id()
    if not sid:
        return jsonify({"error": "X-Session-Id header is required"}), 400
    data = request.get_json(silent=True) or {}
    product_id = int(data.get("product_id") or 0)
    quantity = max(1, int(data.get("quantity") or 1))
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product does not exist"}), 400
    existing = CartLine.query.filter_by(session_id=sid, product_id=product_id).first()
    total_qty = quantity + (existing.quantity if existing else 0)
    if total_qty > product.stock:
        return jsonify({"error": f"Only {product.stock} item(s) in stock"}), 400
    if existing:
        existing.quantity = total_qty
    else:
        db.session.add(CartLine(session_id=sid, product_id=product_id, quantity=quantity))
    db.session.commit()
    return jsonify(_cart_summary(sid))


@api_bp.route("/cart/<int:line_id>", methods=["DELETE"])
def remove_cart_line(line_id: int):
    sid = _session_id()
    if not sid:
        return jsonify({"error": "X-Session-Id header is required"}), 400
    line = CartLine.query.filter_by(id=line_id, session_id=sid).first()
    if not line:
        return jsonify({"error": "Cart item not found"}), 400
    db.session.delete(line)
    db.session.commit()
    return jsonify(_cart_summary(sid))


@api_bp.route("/cart/<int:line_id>", methods=["PATCH"])
def patch_cart_line(line_id: int):
    sid = _session_id()
    if not sid:
        return jsonify({"error": "X-Session-Id header is required"}), 400
    data = request.get_json(silent=True) or {}
    quantity = max(1, int(data.get("quantity") or 1))
    line = CartLine.query.filter_by(id=line_id, session_id=sid).first()
    if not line:
        return jsonify({"error": "Cart item not found"}), 400
    prod = line.product
    if prod and quantity > prod.stock:
        return jsonify({"error": f"Only {prod.stock} item(s) in stock"}), 400
    line.quantity = quantity
    db.session.commit()
    return jsonify(_cart_summary(sid))


@api_bp.route("/cart/apply-coupon", methods=["POST"])
def apply_coupon():
    sid = _session_id()
    if not sid:
        return jsonify({"error": "X-Session-Id header is required"}), 400
    data = request.get_json(silent=True) or {}
    code = str(data.get("code") or "").strip().upper()
    summary = _cart_summary(sid)
    if code not in COUPONS:
        return jsonify({"error": "Invalid coupon"}), 400
    pct = COUPONS[code]
    discount_amount = round(summary["subtotal"] * (pct / 100))
    total = summary["subtotal"] - discount_amount
    return jsonify(
        {
            **summary,
            "coupon": {"code": code, "discount_percent": pct},
            "discount_amount": discount_amount,
            "total": total,
        }
    )


@api_bp.route("/newsletter", methods=["POST"])
def newsletter():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if NewsletterSubscriber.query.filter_by(email=email).first():
        return jsonify({"message": "Subscribed successfully"})
    db.session.add(NewsletterSubscriber(email=email))
    db.session.commit()
    return jsonify({"message": "Subscribed successfully"})


@api_bp.route("/contact", methods=["POST"])
def contact():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip()
    message = str(data.get("message") or "").strip()
    if not name or not email or not message:
        return jsonify({"error": "name, email, and message are required"}), 400
    db.session.add(
        ContactMessage(
            name=name,
            email=email,
            subject=str(data.get("subject") or "").strip(),
            message=message,
        )
    )
    db.session.commit()
    return jsonify({"message": "Message received"})


@api_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    full_name = str(data.get("full_name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    mobile = str(data.get("mobile") or "").strip()
    password = str(data.get("password") or "")
    if not full_name or not email or not mobile or not password:
        return jsonify({"error": "full_name, email, mobile, password are required"}), 400
    if User.query.filter((User.email == email) | (User.mobile == mobile)).first():
        return jsonify({"error": "User already exists with this email or mobile"}), 400
    user = User(
        email=email,
        mobile=mobile,
        full_name=full_name,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"user_id": user.id, "full_name": full_name, "email": email, "mobile": mobile})


@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "")
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 400
    return jsonify({"user_id": user.id, "full_name": user.full_name, "email": user.email, "mobile": user.mobile})


@api_bp.route("/addresses", methods=["POST"])
def save_address():
    data = request.get_json(silent=True) or {}
    user_id = int(data.get("user_id") or 0)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    addr = Address(
        user_id=user_id,
        full_name=str(data.get("customer_name") or data.get("full_name") or "").strip(),
        email=str(data.get("customer_email") or data.get("email") or "").strip(),
        mobile=str(data.get("mobile") or "").strip(),
        pincode=str(data.get("pincode") or "").strip(),
        locality=str(data.get("locality") or "").strip(),
        city=str(data.get("city") or "").strip(),
        state=str(data.get("state") or "").strip(),
        landmark=str(data.get("landmark") or "").strip(),
    )
    if not all([addr.full_name, addr.email, addr.mobile, addr.pincode, addr.locality, addr.city, addr.state]):
        return jsonify({"error": "Missing address fields"}), 400
    db.session.add(addr)
    db.session.commit()
    return jsonify({"address_id": addr.id, "message": "Address saved"})


@api_bp.route("/addresses/latest/<int:user_id>", methods=["GET"])
def latest_address(user_id: int):
    addr = (
        Address.query.filter_by(user_id=user_id).order_by(Address.created_at.desc()).first()
    )
    if not addr:
        return jsonify({"error": "No address found"}), 404
    return jsonify(
        {
            "full_name": addr.full_name,
            "email": addr.email,
            "mobile": addr.mobile,
            "pincode": addr.pincode,
            "locality": addr.locality,
            "city": addr.city,
            "state": addr.state,
            "landmark": addr.landmark or "",
        }
    )


def _next_order_number():
    return f"CARA-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(100000, 999999)}"


@api_bp.route("/checkout", methods=["POST"])
def checkout():
    """Dummy UPI/NetBanking style payment: simulates NPCI delay and returns Indian-style txn id."""
    sid = _session_id()
    if not sid:
        return jsonify({"error": "X-Session-Id header is required"}), 400

    data = request.get_json(silent=True) or {}
    summary = _cart_summary(sid)
    if not summary["items"]:
        return jsonify({"error": "Cart is empty"}), 400

    pincode = str(data.get("pincode") or "").strip()
    state = str(data.get("state") or "").strip()
    if not re.fullmatch(r"\d{6}", pincode):
        return jsonify({"error": "Valid 6-digit pincode required"}), 400
    if not state:
        return jsonify({"error": "State is required"}), 400

    payment_method = str(data.get("payment_method") or "UPI").strip() or "UPI"
    time.sleep(2)

    txn = f"UPI-NPCI-{random.randint(10000000, 99999999)}"
    order = Order(
        order_number=_next_order_number(),
        user_id=int(data["user_id"]) if data.get("user_id") else None,
        total_inr=summary["subtotal"],
        status="paid",
        payment_method=payment_method,
        transaction_id=txn,
        customer_name=str(data.get("customer_name") or "Guest").strip(),
        customer_email=str(data.get("customer_email") or "").strip() or "guest@example.com",
        mobile=str(data.get("mobile") or "").strip() or "0000000000",
        pincode=pincode,
        locality=str(data.get("locality") or "").strip() or "—",
        city=str(data.get("city") or "").strip() or "—",
        state=state,
        landmark=str(data.get("landmark") or "").strip(),
    )
    db.session.add(order)

    for line in CartLine.query.filter_by(session_id=sid).all():
        db.session.delete(line)
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "order_id": order.id,
            "order_number": order.order_number,
            "total": order.total_inr,
            "transaction_id": txn,
            "payment_method": payment_method,
            "message": "Payment successful",
        }
    )

