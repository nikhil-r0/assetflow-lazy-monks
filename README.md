# AssetFlow — Lazy Monks

Enterprise Asset & Resource Management System (hackathon).

## Docs (read in this order)

| File | Purpose |
|---|---|
| **`BUILD_SPEC.md`** *(local only — gitignored)* | Full build bible: schema, RBAC, APIs, phases, tests. **Authority for code.** |
| **`ASSETFLOW.md`** | Short winning guide: thesis, 3 hard rules, demo script, DoD |
| **`AssetFlow_Hackathon_Plan.md`** | 8-hour schedule + who owns A/B/C/D |
| **[Issue #12](https://github.com/nikhil-r0/assetflow-lazy-monks/issues/12)** | Live tracker: what’s on `develop`, what’s left, 3 hard rules |

If docs disagree → **`BUILD_SPEC.md` wins**.

## Tracks at a glance

| Track | Screens | Owns |
|---|---|---|
| **A — Auth/Org** | 1, 3 | Login/signup, RBAC, departments, categories, employee promote |
| **B — Assets** | 4, 5 | Registry, allocate/return, transfer, overdue (**Rule 1**) |
| **C — Operations** | 6, 7 | Booking overlap (**Rule 2**), maintenance gate (**Rule 3**) |
| **D — Insights** | 2, 8, 9, 10 | Dashboard, audit, reports, notifications/logs |

Living done/todo → **[Issue #12](https://github.com/nikhil-r0/assetflow-lazy-monks/issues/12)**.

---

## Local QA (every teammate)

Run the stack locally so you can visually QA what you build before merging.

### Prerequisites
- Node **20+**, npm **10+**
- **Docker** (Desktop or Engine) for Postgres

### One-time setup

```bash
git clone git@github.com:nikhil-r0/assetflow-lazy-monks.git
cd assetflow-lazy-monks
git checkout develop && git pull
npm install

# Postgres (host port 5434 → container 5432)
docker compose up -d

# Backend env — use port 5434 to match docker-compose
cp backend/.env.example backend/.env
# Confirm DATABASE_URL uses localhost:5434

cd backend
npx prisma migrate deploy
npx prisma generate
```

`backend/.env` should look like:

```env
DATABASE_URL="postgresql://assetflow:assetflow@localhost:5434/assetflow?schema=public"
JWT_SECRET="dev-secret-change-me"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

### Every session (two terminals)

```bash
# terminal 1 — API
cd backend && npm run dev
# → http://localhost:4000

# terminal 2 — UI
cd frontend && npm run dev
# → http://localhost:5173
```

### Smoke check
1. Open http://localhost:5173 — signup (employee) → login
2. Exercise the screens for your track
3. http://localhost:4000/api/v1/health → `{ "status": "ok", "db": true }`
4. Optional: `cd backend && npx prisma studio` to inspect tables

### After pulling `develop`

```bash
git pull origin develop
npm install                  # if package-lock changed
docker compose up -d         # if DB was stopped
cd backend && npx prisma migrate deploy && npx prisma generate
# then start backend + frontend as above
```

### Common footguns

| Symptom | Fix |
|---|---|
| Health `db: false` / connection refused | `DATABASE_URL` must use port **5434** (compose mapping) |
| Prisma client / schema errors after pull | `cd backend && npx prisma generate` |
| CORS / browser can’t reach API | FE on `5173`, API on `4000`, `CORS_ORIGIN` matches |
| Port 5434 already in use | Change compose host port **and** `.env` together |

### Tests

```bash
cd backend && npm test
```

## Seed accounts (once seed lands)

See `BUILD_SPEC.md` §4.3 — password `Passw0rd!`.
