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

## 🚀 Local development setup (no hosting platforms)

This section explains how to run everything locally only (no Render/Cloudflare deployment).

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 12+
- Git

### 1. Backend Setup (Flask + PostgreSQL)

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# or: source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Prepare env
copy .env.example .env
# Edit .env:
# DATABASE_URL=postgresql://<user>:<pass>@localhost/<db_name>
# SECRET_KEY=your-secret-key
# CORS_ORIGINS=http://localhost:3000

# Initialize DB schema (one-time)
psql -U postgres -d pakistan_campaign -f ../database/schema/init.sql

# Seed campaign data
python seed_campaigns.py

# Start backend
python wsgi.py
# or: flask run (app defaults to localhost:5000)
```

### 2. Frontend Setup (React)

```bash
cd frontend

npm install

copy .env.example .env.local
# In .env.local:
# REACT_APP_API_URL=http://localhost:5000

npm start
```

### 3. Verify locally

1. Open http://localhost:3000
2. Go to Campaign Planner
3. Select a campaign
4. Click `Generate New` in the push notification overlay
5. Confirm callouts are generated and selectable

### 4. Ollama local LLM (optional for generated callouts)

If you want AI callout generation via local model:

```bash
# Install ollama (https://ollama.com/docs/installation)
ollama pull mistral
ollama serve
```

`push_notification_routes.py` uses `http://127.0.0.1:11434/api/chat` by default.

If Ollama is down, the backend falls back to mock callouts.

---

### (No cloud hosting in this workflow)

- Skip all Render/Cloudflare deployment instructions when running locally.
- Keep triggers and dev config in the local environment only.

### 5. Troubleshooting

- No backend response: verify backend console and that Flask is running.
- CORS errors: confirm `CORS_ORIGINS=http://localhost:3000` in backend `.env`.
- Database errors: confirm `DATABASE_URL` and that PostgreSQL service is running.
- Ollama timeout: restart `ollama serve` and increase timeout in `push_notification_routes.py` if needed.


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
