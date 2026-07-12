# API Contract

Base URL: `http://localhost:4000/api/v1`

Frozen route list grows as tracks merge. Full specs live in `BUILD_SPEC.md`.

## Live now (Track B Phase 0)

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | public | `{ status: "ok", db: false }` until A wires DB check |
| GET | `/assets/ping` | public | `{ module: "assets" }` |

## Planned (do not invent extras)

- **A:** `/auth/signup`, `/auth/login`, `/auth/me`, `/departments`, `/categories`, `/users`…
- **B:** `/assets`, `/allocations`, `/transfer-requests`… (Phases 1–5)
- **C:** `/bookings`, `/maintenance-requests`…
- **D:** `/dashboard/kpis`, `/audit-cycles`, `/reports/*`, `/notifications`, `/activity-logs`…
