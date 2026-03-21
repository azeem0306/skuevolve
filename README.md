# Pakistan Campaign Planner - Three-Tier Architecture

A production-ready campaign planning and inventory management system for Pakistan e-commerce with:
- **Frontend**: React app deployed on Cloudflare Pages
- **Backend**: Python Flask API deployed on Render
- **Database**: PostgreSQL for persistent data storage

## 📋 Project Structure

```
pakistan-campaign-planner/
├── frontend/                 # React application (Cloudflare Pages)
│   ├── public/
│   ├── src/
│   │   ├── api/            # API client for backend communication
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   └── context/        # React context for state management
│   ├── package.json
│   └── .env.example
├── backend/                 # Flask API (Render)
│   ├── app/
│   │   ├── __init__.py     # App factory
│   │   ├── models.py       # SQLAlchemy models
│   │   └── routes/         # API endpoints
│   ├── migrations/         # Database migrations
│   ├── requirements.txt    # Python dependencies
│   ├── wsgi.py            # WSGI entry point
│   ├── render.yaml        # Render deployment config
│   ├── seed_campaigns.py  # Data seeding script
│   └── migrate_csv_to_db.py
├── database/              # Database schema & scripts
│   └── schema/
│       └── init.sql      # PostgreSQL schema definition
├── docs/                 # Documentation
├── wrangler.toml        # Cloudflare Pages config
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 12+
- Git

### 1. Backend Setup (Flask + PostgreSQL)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

# Initialize database
psql -U postgres -d pakistan_campaign -f ../database/schema/init.sql

# Seed campaigns and forecasts
python seed_campaigns.py

# Run locally (development)
flask run

# API should be available at http://localhost:5000
```

### 2. Frontend Setup (React)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env.local
# Set REACT_APP_API_URL to http://localhost:5000

# Start development server
npm start

# App should be available at http://localhost:3000
```

### 3. Verify Integration

1. Open http://localhost:3000 in browser
2. Navigate to Campaign Planner
3. Select a campaign - should load hero products from API
4. Click "Generate SKU Mix" - should display filtered SKUs from database

## 📡 API Endpoints

### Campaigns
- `GET /api/campaigns` - Get all campaigns with hero products
- `GET /api/campaigns/<id>` - Get specific campaign details
- `GET /api/campaigns/<id>/hero-products` - Get hero products for campaign

### Inventory
- `GET /api/inventory` - Get all inventory
- `GET /api/inventory/<sku>` - Get inventory for specific SKU
- `POST /api/inventory` - Bulk lookup by SKUs (body: `{"skus": ["SKU1", "SKU2"]}`)
- `GET /api/inventory/low-stock` - Get items below reorder point

### Health
- `GET /api/health` - Health check endpoint

## 🔧 Deployment

### Deploy Backend to Render

1. **Create Render Account** at https://render.com

2. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pakistan-campaign-planner.git
   git push -u origin main
   ```

3. **Create New Web Service in Render Dashboard**
   - Connect GitHub repository
   - Select `backend` as Root Directory
   - Use `render.yaml` for configuration
   - Add PostgreSQL database
   - Deploy

4. **Run Migrations on Render**
   ```bash
   # In Render dashboard, go to your service
   # Click "Shell" and run:
   python migrate_csv_to_db.py
   python seed_campaigns.py
   ```

### Deploy Frontend to Cloudflare Pages

1. **Create Cloudflare Account** at https://cloudflare.com

2. **Connect GitHub to Cloudflare Pages**
   - Go to Pages dashboard
   - "Connect to Git"
   - Select repository
   - Project name: `pakistan-campaign-dashboard`
   - Framework preset: React
   - Build command: `npm run build` (in `frontend` folder)
   - Build output: `frontend/build`

3. **Set Environment Variables**
   - In Cloudflare Pages settings
   - Add `REACT_APP_API_URL = https://your-render-api.onrender.com`

4. **Deploy**
   - Trigger deployment from dashboard or push to `main` branch

## 📊 Data Flow

```
CSV Files (daraz_pak_data.csv, inventory_data.csv)
    ↓
Backend Migrations (Python scripts)
    ↓
PostgreSQL Database
    ↓
Flask API Endpoints
    ↓ (HTTP/JSON)
React Frontend (API Client)
    ↓
User Browser
```

## 🔐 Environment Variables

### Backend (.env)
```env
FLASK_ENV=production
DATABASE_URL=postgresql://user:password@host/db_name
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=https://your-cloudflare-domain.com
```

### Frontend (.env.local)
```env
REACT_APP_API_URL=https://your-render-api.onrender.com
REACT_APP_ENV=production
```

## 📚 Documentation

- [Backend README](./backend/README.md) - API development & deployment
- [Frontend README](./frontend/README.md) - React app setup & customization
- [Database README](./database/README.md) - Schema & migrations

## 🐛 Troubleshooting

**Frontend shows "Failed to fetch campaigns"**
- Check `REACT_APP_API_URL` is set correctly
- Verify backend is running and accessible
- Check CORS configuration in Flask

**Database migration fails**
- Verify PostgreSQL is running
- Check connection string in `.env`
- Review `database/schema/init.sql` syntax

**API returns 404 for campaigns**
- Run `python seed_campaigns.py` to populate data
- Check `dashboard_data.json` exists

## 📝 License

This project is part of the Pakistan E-commerce Campaign Planner initiative.
