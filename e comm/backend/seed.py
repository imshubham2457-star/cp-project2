"""Seed SQLite with 10 Indian-market products (INR). Run from backend/: python seed.py"""

from app import app
from models import Product, db

SEED_PRODUCTS = [
    {
        "name": "Apple iPhone 15 (Blue, 128 GB)",
        "brand": "Apple",
        "price_inr": 79900,
        "description": "6.1-inch Super Retina XDR display, A16 Bionic chip, advanced dual-camera system, USB-C, and all-day battery life. Includes 1-year Apple India warranty.",
        "image": "img/products/f1.jpg",
        "stock": 25,
        "category": "Mobiles",
    },
    {
        "name": "boAt Rockerz 450 Bluetooth On-Ear Headphones",
        "brand": "boAt",
        "price_inr": 1499,
        "description": "40mm drivers, up to 15 hours playback, lightweight foldable design, dual connectivity modes. Perfect for daily commute and WFH in India.",
        "image": "img/products/f2.jpg",
        "stock": 200,
        "category": "Electronics",
    },
    {
        "name": "Tata Tea Gold, 500g",
        "brand": "Tata",
        "price_inr": 285,
        "description": "Premium blend with long leaves for a strong, refreshing cup. Trusted household name across India.",
        "image": "img/products/f3.jpg",
        "stock": 500,
        "category": "Grocery",
    },
    {
        "name": "Samsung Galaxy M34 5G (8GB RAM, 128GB)",
        "brand": "Samsung",
        "price_inr": 18999,
        "description": "120Hz Super AMOLED display, 6000mAh battery, 50MP triple camera, 5G ready for Indian networks.",
        "image": "img/products/f4.jpg",
        "stock": 60,
        "category": "Mobiles",
    },
    {
        "name": "Prestige Popular Svachh Aluminium Pressure Cooker 5 L",
        "brand": "Prestige",
        "price_inr": 2495,
        "description": "Gas and induction compatible, deep lid controls spillage, durable aluminium body—ideal for Indian cooking.",
        "image": "img/products/f5.jpg",
        "stock": 80,
        "category": "Home & Kitchen",
    },
    {
        "name": "Lux Velvet Touch Soap Pack of 3",
        "brand": "Lux",
        "price_inr": 235,
        "description": "Fragrant bathing bars with moisturizing benefits. Widely available and loved across India.",
        "image": "img/products/f6.jpg",
        "stock": 300,
        "category": "Beauty",
    },
    {
        "name": "Philips Air Fryer HD9252/90 (4.1 L)",
        "brand": "Philips",
        "price_inr": 8999,
        "description": "Rapid Air technology for frying with up to 90% less fat, digital display, preset Indian recipes.",
        "image": "img/products/f7.jpg",
        "stock": 40,
        "category": "Home & Kitchen",
    },
    {
        "name": "MI Power Bank 3i 20000mAh (18W Fast Charging)",
        "brand": "Mi",
        "price_inr": 2199,
        "description": "Dual USB output, Type-C input/output, BIS certified for safe use in India.",
        "image": "img/products/f8.jpg",
        "stock": 150,
        "category": "Electronics",
    },
    {
        "name": "Puma Unisex Softride Running Shoes",
        "brand": "Puma",
        "price_inr": 3499,
        "description": "Cushioned midsole, breathable mesh upper, durable rubber outsole—great for jogging and daily wear.",
        "image": "img/products/n1.jpg",
        "stock": 90,
        "category": "Fashion",
    },
    {
        "name": "Dettol Antiseptic Liquid 1 L",
        "brand": "Dettol",
        "price_inr": 289,
        "description": "First-aid, surface cleaning, and personal hygiene. Recommended by doctors, trusted in Indian homes.",
        "image": "img/products/n2.jpg",
        "stock": 400,
        "category": "Health",
    },
]


def run():
    with app.app_context():
        if Product.query.count() > 0:
            print("Products already seeded; skipping.")
            return
        for row in SEED_PRODUCTS:
            db.session.add(Product(**row))
        db.session.commit()
        print(f"Seeded {len(SEED_PRODUCTS)} products.")


if __name__ == "__main__":
    run()
