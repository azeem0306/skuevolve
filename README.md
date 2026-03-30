# SKUEvolve

## Starting the Platform

### First-time setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
cd frontend && npm install
```

### Every run — Option A: PowerShell - Windows

```powershell

powershell -ExecutionPolicy Bypass -File start-dev.ps1

```

### Every run — Option B: Command Prompt - Double click on windows

```bat

start-dev.bat

```

Both scripts will:
1. Activate the virtual environment
2. Run `build_dashboard.py` to generate dashboard data
3. Open Flask backend in a new window (port 5000)
4. Open React frontend in a new window (port 3000)

### Every run — Option C: Single terminal with npm run dev - Mac/ Linux

From [frontend/package.json](frontend/package.json), run:

```bash
cd frontend
npm run dev
```

This runs backend + frontend in one terminal with color-coded prefixes:
1. `backend`: runs `build_dashboard.py`, then starts `wsgi.py`
2. `frontend`: runs `react-scripts start`



## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

## Credentials

| Role | Email | Password |
|------|-------|----------|
| Operations Executive | amal.perera@skuevolve.com | amal123 |
| Campaign Planner | kavindu.vihanga@skuevolve.com | kavindu123 |
| Campaign Manager | azeem.rashard@skuevolve.com | azeem123 |
| Admin | mohomed.amir@skuevolve.com | admin123 |
