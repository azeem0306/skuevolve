# Frontend Localhost Setup

This README contains only localhost setup and run steps.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- Backend running on localhost:5000

## 2) Install dependencies

```bash
cd frontend
npm install
```

## 3) Configure local frontend environment

Create `frontend/.env.local`:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

## 4) Run frontend locally

```bash
npm start
```

Frontend should open at:
- http://localhost:3000

## 5) Build locally (optional)

```bash
npm run build
```

## 6) Local verification

- Open http://localhost:3000
- Confirm dashboard loads campaign data
- Confirm campaign planner and war room routes work
- Confirm API requests return success in browser network tab
