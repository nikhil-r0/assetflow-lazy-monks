# Track B — Assets module

**Screens:** 4 (Registry), 5 (Allocation & Transfer)

## Live endpoints

| Method | Path | Roles |
|---|---|---|
| GET | `/api/v1/assets/ping` | public |
| POST | `/api/v1/assets` | admin, asset_manager |
| GET | `/api/v1/assets` | auth |
| GET | `/api/v1/assets/:id` | auth |
| PATCH | `/api/v1/assets/:id` | admin, asset_manager (no status) |
| PATCH | `/api/v1/assets/:id/status` | admin, asset_manager |
| GET | `/api/v1/assets/:id/history` | auth |
| POST | `/api/v1/assets/:id/documents` | admin, asset_manager |
| POST | `/api/v1/allocations` | admin, asset_manager |
| POST | `/api/v1/allocations/:id/return` | admin, asset_manager |

Auth: Bearer JWT **or** parallel-dev headers `x-user-id` + `x-user-role`.

## Hard rule
Double allocation → **409 CONFLICT** with `holder_name` (Transfer CTA).

## Still TODO
- Transfer request workflow (Phase 4)
- Overdue DB flagger endpoint (pure helper done)
- FE wiring to these APIs
