from . import db


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(300), nullable=False)
    brand = db.Column(db.String(120), nullable=False)
    price_inr = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, default="")
    image = db.Column(db.String(500), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=10)
    category = db.Column(db.String(120), default="General")
