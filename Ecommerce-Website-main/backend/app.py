import os

from dotenv import load_dotenv
from flask import Flask

from models import db
from routes import register_blueprints

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///ecommerce.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    register_blueprints(app)

    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ]
    extra = os.getenv("CORS_EXTRA_ORIGINS", "")
    if extra:
        cors_origins.extend([o.strip() for o in extra.split(",") if o.strip()])

    from flask_cors import CORS

    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-Session-Id"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
