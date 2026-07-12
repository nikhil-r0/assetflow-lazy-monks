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
| POST | `/api/v1/allocations/flag-overdue` | admin, asset_manager |
| POST | `/api/v1/allocations/:id/return` | admin, asset_manager |
| POST | `/api/v1/transfer-requests` | auth |
| GET | `/api/v1/transfer-requests` | auth (scoped) |
| POST | `/api/v1/transfer-requests/:id/approve` | admin, asset_manager, department_head |
| POST | `/api/v1/transfer-requests/:id/reject` | admin, asset_manager, department_head |

Auth: Bearer JWT **or** parallel-dev headers `x-user-id` + `x-user-role`.

## Hard rules
- Double allocation → **409 CONFLICT** with `holder_name` (Transfer CTA).
- Approve transfer atomically closes old allocation + opens new (one active invariant).
- Due today is **not** overdue; only strictly past `expected_return_date` (UTC date).

## Jobs
Server also runs `flagOverdueAllocations` every 60s (same cadence as booking jobs).

## Frontend
- `/assets` — registry list, filters, history expand
- `/assets/new` — register form (category custom fields)
- `/allocations` — allocate / return / transfer / overdue flag
