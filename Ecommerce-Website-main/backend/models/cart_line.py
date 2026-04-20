from . import db


class CartLine(db.Model):
    __tablename__ = "cart_lines"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)

    product = db.relationship("Product", backref=db.backref("cart_lines", lazy="dynamic"))
