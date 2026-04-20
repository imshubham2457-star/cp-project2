# Flask Backend for Ecommerce Frontend

This backend provides a ready-to-use API and SQLite database for your existing ecommerce frontend.

## Setup

1. Open a terminal in `backend`.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the server:

```bash
python app.py
```

The API will run at `http://localhost:5000`.

## Deploy (Render)

1. Push this project to GitHub.
2. In Render, create a new **Blueprint** deployment and point it to your repository.
3. Render will detect `backend/render.yaml` and deploy automatically.
4. Set frontend API base URL to your Render backend URL, e.g. `https://<your-service>.onrender.com/api`.

## API Routes

- `GET /api/health` - backend health check
- `GET /api/products` - list all products (`?category=featured` optional)
- `GET /api/products/<id>` - get one product
- `GET /api/cart` - get cart + subtotal
- `POST /api/cart` - add item to cart (`product_id`, `quantity`)
- `PATCH /api/cart/<item_id>` - update cart quantity (`quantity`)
- `DELETE /api/cart/<item_id>` - remove cart item
- `POST /api/cart/apply-coupon` - apply a coupon (`code`)
- `POST /api/checkout` - place an order (`customer_name`, `customer_email`)
- `POST /api/newsletter` - subscribe email (`email`)
- `POST /api/contact` - submit contact message (`name`, `email`, `subject`, `message`)

## Notes

- SQLite DB file is created automatically as `backend/ecommerce.db`.
- Seed products and coupons are inserted on first run.
