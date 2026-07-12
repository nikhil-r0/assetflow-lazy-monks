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
| POST | `/transfer-requests` | auth |
| GET | `/transfer-requests` | auth |
| POST | `/transfer-requests/:id/approve` | admin, asset_manager, department_head |
| POST | `/transfer-requests/:id/reject` | admin, asset_manager, department_head |

Double-allocation → **409** with `holder_name` in details.  
Transfer approve → atomic re-allocation (`requested` → `completed`).

## Also live
- A: `/auth/*` (+ org/categories/users when mounted)
- C: `/bookings`, `/maintenance-requests`, `/operations/ping`
- D: `/notifications`, `/activity-logs`, insights pings
- `/health` — `db: true` when Postgres reachable (port **5434**)

## Still planned
- B: overdue flag endpoint
