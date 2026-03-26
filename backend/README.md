# Backend Localhost Setup

This project is configured for local demo mode with SQLite.

## 1) Prerequisites

- Python 3.10+

## 2) Create and activate virtual environment

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
```

# Use python3 if you are using a MacBook

## 3) Install dependencies

```bash
pip install -r requirements.txt
```

# Use pip3 if you are using a MacBook

## 4) Configure environment

Create `backend/.env`:

```env
FLASK_ENV=development
DATABASE_URL=sqlite:///campaign.db
SECRET_KEY=local-dev-secret
CORS_ORIGINS=http://localhost:3000
```

If `DATABASE_URL` is omitted, SQLite is still used by default.

## 5) Generate local data

```bash
python scripts/generate_inventory.py
python scripts/build_dashboard.py
python scripts/generate_inventory_json.py
```

Optional data check:

```bash
python scripts/check_empty_skus.py
```

## 6) Run backend

```bash
python wsgi.py
```

Backend runs on http://localhost:5000

## 7) Health check

```bash
curl http://localhost:5000/api/health
```
