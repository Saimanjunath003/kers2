# KristalBall — Military Asset Management System

A full-stack military logistics platform for tracking assets across bases with RBAC and AI-powered analysis.

## Tech Stack
- **Frontend**: React 18, Recharts, Axios
- **Backend**: Node.js, Express
- **Database**: SQLite (via better-sqlite3)
- **AI**: OpenRouter API → Google Gemini 2.5 Pro

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
# DB auto-creates and seeds on first run
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

---

## Login Credentials

| Username       | Password        | Role               | Base Access   |
|----------------|-----------------|--------------------|---------------|
| `admin`        | `admin123`      | Admin              | All bases     |
| `cmd_alpha`    | `commander123`  | Base Commander     | Alpha Base    |
| `cmd_bravo`    | `commander123`  | Base Commander     | Bravo Base    |
| `log_officer1` | `logistics123`  | Logistics Officer  | Alpha Base    |
| `log_officer2` | `logistics123`  | Logistics Officer  | Bravo Base    |

---

## Features

### Dashboard
- Opening balance, closing balance, net movement, purchases, transfers, assignments, expenditures
- Filters: date range, base, equipment type
- Clickable **Net Movement** card → detailed popup (purchases / transfers in / out)
- **AI Analyst panel** (Gemini 2.5 Pro via OpenRouter) — ask questions, detect anomalies, get optimization recommendations

### Purchases Page
- Record new asset purchases for a base
- Full history with filters and pagination

### Transfers Page
- Transfer assets between bases (validates stock availability)
- Full transfer history with status tracking

### Assignments & Expenditures Page
- Assign assets to named personnel with mission context
- Record asset expenditures (reduces stock)
- Filterable history

### Audit Logs (Admin only)
- Every transaction logged: purchases, transfers, assignments, logins
- Expandable detail view with raw JSON payload

---

## RBAC Summary

| Feature              | Admin | Base Commander | Logistics Officer |
|----------------------|-------|----------------|-------------------|
| All bases dashboard  | ✅    | ❌ (own base)  | ❌ (own base)     |
| Create purchases     | ✅    | ✅             | ✅                |
| Create transfers     | ✅    | ✅ (from own)  | ✅ (from own)     |
| Create assignments   | ✅    | ✅             | ✅                |
| View audit logs      | ✅    | ❌             | ❌                |

---

## API Endpoints

| Method | Endpoint                          | Description                   |
|--------|-----------------------------------|-------------------------------|
| POST   | /api/auth/login                   | Authenticate user             |
| GET    | /api/auth/me                      | Get current user              |
| GET    | /api/dashboard/metrics            | Get dashboard metrics         |
| GET    | /api/dashboard/net-movement-detail| Net movement breakdown        |
| GET    | /api/dashboard/bases              | List all bases                |
| GET    | /api/dashboard/equipment-types    | List equipment types          |
| GET    | /api/purchases                    | List purchases (filtered)     |
| POST   | /api/purchases                    | Create purchase               |
| GET    | /api/transfers                    | List transfers (filtered)     |
| POST   | /api/transfers                    | Create transfer               |
| GET    | /api/assignments                  | List assignments (filtered)   |
| POST   | /api/assignments                  | Create assignment/expenditure |
| GET    | /api/audit                        | Audit logs (admin only)       |

---

## OpenRouter / AI Configuration

The AI Analyst uses **Google Gemini 2.5 Pro** via OpenRouter.
Configuration is in `frontend/src/utils/openrouter.js`.

The AI can:
- Analyze current stock metrics
- Detect anomalies in movement data
- Suggest logistics optimizations
- Answer natural language questions about your inventory
