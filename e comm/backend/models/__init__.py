from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user import User  # noqa: E402
from .product import Product  # noqa: E402
from .order import Order  # noqa: E402
from .address import Address  # noqa: E402
from .cart_line import CartLine  # noqa: E402
from .newsletter import NewsletterSubscriber  # noqa: E402
from .contact import ContactMessage  # noqa: E402

__all__ = [
    "db",
    "User",
    "Product",
    "Order",
    "Address",
    "CartLine",
    "NewsletterSubscriber",
    "ContactMessage",
]
