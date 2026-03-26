# SKUEvolve Local Demo

Local demo stack for campaign planning, dashboard analytics, and war-room operations.

## What Is Included

- Frontend: React app in `frontend`
- Backend: Flask API in `backend`
- Data pipeline: Python scripts in `backend/scripts`
- Local persistence: SQLite (default)

## Quick Start

### 1) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
FLASK_ENV=development
DATABASE_URL=sqlite:///campaign.db
SECRET_KEY=local-dev-secret
CORS_ORIGINS=http://localhost:3000
```

Generate demo data:

```bash
python scripts/generate_inventory.py
python scripts/build_dashboard.py
python scripts/generate_inventory_json.py
```

Run backend:

```bash
python wsgi.py
```

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on http://localhost:3000

## Local URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Optional: Local Ollama for AI Callouts

```bash
ollama pull mistral
ollama serve
```

If unavailable, mock callouts are used.

## Docs

- Backend setup: [backend/README.md](backend/README.md)
- Frontend setup: [frontend/README.md](frontend/README.md)
- Full system guide: [docs/README.md](docs/README.md)
