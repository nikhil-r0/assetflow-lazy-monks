# API Contract

Base URL: `http://localhost:4000/api/v1`

Auth: `Authorization: Bearer <jwt>` **or** headers `x-user-id` + `x-user-role` (parallel-dev).

## Live — Track B

| Method | Path | Roles |
|---|---|---|
| GET | `/assets/ping` | public |
| POST | `/assets` | admin, asset_manager |
| GET | `/assets` | auth |
| GET | `/assets/:id` | auth |
| PATCH | `/assets/:id` | admin, asset_manager (no `status`) |
| PATCH | `/assets/:id/status` | admin, asset_manager |
| GET | `/assets/:id/history` | auth |
| POST | `/assets/:id/documents` | admin, asset_manager |
| POST | `/allocations` | admin, asset_manager |
| POST | `/allocations/:id/return` | admin, asset_manager |

Double-allocation → **409** with `holder_name` in details.

## Also live
- C: `/bookings`, `/maintenance-requests`, `/operations/ping`
- D: `/notifications`, `/activity-logs`, insights pings
- `/health` — `db: true` when Postgres reachable (port **5434**)

## Still planned
- A: `/auth/*`, `/departments`, `/categories`, `/users`
- B: `/transfer-requests`, overdue flag endpoint
