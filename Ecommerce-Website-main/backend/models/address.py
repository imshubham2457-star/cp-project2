from datetime import datetime

from . import db


class Address(db.Model):
    __tablename__ = "addresses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    mobile = db.Column(db.String(15), nullable=False)
    pincode = db.Column(db.String(6), nullable=False)
    locality = db.Column(db.String(300), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    state = db.Column(db.String(120), nullable=False)
    landmark = db.Column(db.String(300), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("addresses", lazy="dynamic"))
