# AssetFlow — Lazy Monks

Enterprise Asset & Resource Management System (hackathon).

## Docs (read in this order)

| File | Purpose |
|---|---|
| **`BUILD_SPEC.md`** *(local only — gitignored)* | Full build bible: schema, RBAC, APIs, phases, tests. **Authority for code.** |
| **`ASSETFLOW.md`** | Short winning guide: thesis, 3 hard rules, demo script, DoD |
| **`AssetFlow_Hackathon_Plan.md`** | 8-hour schedule + who owns A/B/C/D |
| **`STATUS.md`** | Live snapshot: what’s done, what’s blocked, what each track does next |

If docs disagree → **`BUILD_SPEC.md` wins**.

## Tracks at a glance

| Track | Screens | Owns | Status now |
|---|---|---|---|
| **A — Auth/Org** | 1, 3 | Login/signup, RBAC, departments, categories, employee promote | Schema + monorepo scaffold ✅ · Auth APIs ⏳ |
| **B — Assets** | 4, 5 | Registry, allocate/return, transfer, overdue (**Rule 1**) | Early scaffold ✅ on `feature/assets-allocation` |
| **C — Operations** | 6, 7 | Booking overlap (**Rule 2**), maintenance gate (**Rule 3**) | Waiting on B `transitionStatus` + A auth |
| **D — Insights** | 2, 8, 9, 10 | Dashboard, audit, reports, notifications/logs | Waiting on data from B/C |

## Quick start

```bash
# DB
docker compose up -d

# Install (repo root)
npm install

# Backend (Track B ping works today)
cd backend
cp .env.example .env   # when available; or set DATABASE_URL
npm run dev            # http://localhost:4000
# GET /api/v1/assets/ping → { "module": "assets" }
# GET /api/v1/health

npm test               # Track B unit/integration smoke
```

Frontend: `cd frontend && npm run dev` (Vite starter — real screens TBD by each track).

## Seed accounts (once seed lands)

See `BUILD_SPEC.md` §4.3 — password `Passw0rd!`.
