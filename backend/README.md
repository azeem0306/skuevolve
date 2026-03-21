# Backend API - Python Flask

Production-ready Flask API for campaign planning and inventory management.

## 📦 Stack
- **Framework**: Flask 3.0
- **Database**: PostgreSQL + SQLAlchemy ORM
- **Server**: Gunicorn (production)
- **Deployment**: Render

## 🚀 Local Development

### Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit with local PostgreSQL credentials
```

### Initialize Database

```bash
# Create tables
python -c "from app import create_app; app = create_app(); app.app_context().push()"

# Seed data from existing CSVs
python migrate_csv_to_db.py

# Seed campaigns from dashboard_data.json
python seed_campaigns.py
```

### Run Server

```bash
# Development (hot reload)
flask run

# Production simulation
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py          # App factory, Flask setup
│   ├── models.py            # SQLAlchemy models (Campaign, Inventory, etc.)
│   └── routes/
│       ├── campaign_routes.py    # Campaign API endpoints
│       ├── inventory_routes.py   # Inventory API endpoints
│       └── health_routes.py      # Health check
├── migrations/               # Alembic migrations (future)
├── wsgi.py                   # WSGI entry point for Gunicorn
├── requirements.txt
├── render.yaml              # Render.com deployment config
├── .env.example
├── migrate_csv_to_db.py     # CSV → PostgreSQL migration
└── seed_campaigns.py        # Populate campaigns from JSON
```

## 🗄️ Database Models

### Campaign
- `id`, `name`, `start_date`, `peak_date`, `end_date`
- `projected_volume` (GMV in PKR)
- `strategy`, `action_items`, `status`
- Relations: `hero_products`, `forecasts`

### CampaignProduct
- `campaign_id`, `sku`, `category`, `rank`, `expected_sales`

### CampaignForecast
- `campaign_id`, `date`
- `historical_gmv`, `forecasted_gmv`, `upper_bound`, `lower_bound`

### Inventory
- `sku`, `warehouse`, `supplier`
- `cost_price`, `msrp`
- `qty_on_hand`, `qty_reserved`, `reorder_point`
- `lead_time_days`, `last_restock_date`

### SalesData
- Raw transaction history from Daraz
- `sku`, `date`, `category_name_1/2/3`
- `sales_quantity`, `gmv`

## 🔌 API Endpoints

### GET /api/campaigns
Returns all campaigns with hero products and forecast data.

**Response:**
```json
{
  "Campaigns": {
    "11-11": {
      "id": 1,
      "peak_date": "2018-11-11",
      "projected_volume": 50000000,
      "hero_products": [
        {"sku": "MOBILE-001", "category": "Mobiles & Tablets"},
        ...
      ],
      "graph_data": [...]
    }
  },
  "graph_data": [...]
}
```

### GET /api/campaigns/:id
Get specific campaign with full details.

### GET /api/campaigns/:id/hero-products
Get hero products for a campaign.

### GET /api/inventory
Get all inventory items.

**Response:**
```json
{
  "inventory": [
    {
      "sku": "MOBILE-001",
      "qty_on_hand": 5000,
      "available_qty": 4500,
      "cost_price": 15000,
      "msrp": 35000,
      "lead_time_days": 14
    }
  ]
}
```

### GET /api/inventory/:sku
Get inventory for specific SKU.

### POST /api/inventory
Bulk lookup multiple SKUs.

**Request:**
```json
{"skus": ["MOBILE-001", "DRESS-002"]}
```

### GET /api/inventory/low-stock
Get items below reorder point.

### GET /api/health
Health check endpoint.

## 🚢 Deployment on Render

### Configuration
Render will automatically use `render.yaml` which specifies:
- Python 3.11 runtime
- Build command: `pip install -r requirements.txt && python -m flask db upgrade`
- Start command: `gunicorn -w 4 -b 0.0.0.0:$PORT app.wsgi:app`
- Attached PostgreSQL database

### Steps
1. Push code to GitHub
2. Create Web Service on Render
3. Connect GitHub repository
4. Render will auto-detect `render.yaml` and configure
5. Add environment variables in Render dashboard
6. Deploy

### Environment Variables on Render
```env
FLASK_ENV=production
SECRET_KEY=<generate-random-string>
CORS_ORIGINS=https://your-cloudflare-domain.com
DATABASE_URL=<will-be-set-automatically>
```

## � Automatic Data Generation

### On Application Startup

When the Flask app starts, it **automatically runs the data pipeline**:

1. **`generate_inventory.py`** → Creates `inventory_data.csv`
2. **`build_dashboard.py`** → Creates forecast data
3. **`generate_inventory_json.py`** → Creates React JSON files
4. **`check_empty_skus.py`** → Validates data quality

**You'll see:**
```
🚀 Initializing application data...
📦 Generating inventory data...
✅ Inventory: wrote 200 rows to ../../inventory_data.csv
🧠 Building dashboard forecasts...
✅ Dashboard: Data saved to ../../frontend/src/dashboard_data.json
📄 Generating inventory JSON...
✅ Inventory JSON: wrote 200 rows to ../../frontend/src/inventory_data.json
✔️  Validating data...
✅ All SKUs valid
✅ Application initialized successfully
```

### Manual Regeneration (Without Restarting)

**Endpoint:** `POST /api/admin/regenerate-data`

Trigger a manual data regeneration if you update the source CSV:

```bash
curl -X POST http://localhost:5000/api/admin/regenerate-data
```

Response:
```json
{
  "status": "success",
  "message": "Data regeneration completed",
  "steps": {
    "generate_inventory": {"status": "success", "message": "..."},
    "build_dashboard": {"status": "success", "message": "..."},
    "generate_inventory_json": {"status": "success", "message": "..."},
    "check_empty_skus": {"status": "success", "message": "..."}
  },
  "errors": []
}
```

### Code Details

**Initialization module:** `app/initialization.py`
- Runs all data generation steps in sequence
- Returns detailed status and error logs
- Handles failures gracefully without crashing

**Integration point:** `app/__init__.py` factory
- Calls initialization after database tables created
- Logs all steps during startup

## 🔒 Security Best Practices

- ✅ CORS configured per environment
- ✅ SECRET_KEY randomized on production
- ✅ Database credentials via environment variables
- ✅ No sensitive data in version control
- ✅ SQL injection prevention via SQLAlchemy ORM

## 📝 Development Notes

### Adding New Endpoints

1. Create route function in appropriate file under `app/routes/`
2. Use Flask blueprints for modularity
3. Return JSON with appropriate HTTP status codes
4. Test with curl or Postman

### Modifying Database Schema

For production, use Alembic migrations:
```bash
# After changing models.py
flask db migrate -m "description"
flask db upgrade
```

### Logging

Add logging in production:
```python
import logging
logger = logging.getLogger(__name__)
logger.info("Campaign created: %s", campaign.name)
```
