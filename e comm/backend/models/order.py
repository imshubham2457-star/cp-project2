from datetime import datetime

from . import db


class Order(db.Model):
    """Order with Indian shipping context: 6-digit pincode, state, landmark."""

    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    total_inr = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(40), default="placed")

    payment_method = db.Column(db.String(40), default="UPI")
    transaction_id = db.Column(db.String(64), nullable=True)

    customer_name = db.Column(db.String(200), nullable=False)
    customer_email = db.Column(db.String(255), nullable=False)
    mobile = db.Column(db.String(15), nullable=False)

    pincode = db.Column(db.String(6), nullable=False)
    locality = db.Column(db.String(300), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    state = db.Column(db.String(120), nullable=False)
    landmark = db.Column(db.String(300), default="")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("orders", lazy="dynamic"))
