# Track C — Operations module

**Owner:** Track C · Branch: `feature/ops-phase3-5`  
**Screens:** 6 (Resource Booking), 7 (Maintenance)

## Endpoints

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/v1/operations/ping` | ✅ Phase 0 |
| `POST` | `/api/v1/bookings` | ✅ Phase 1 (overlap half-open + asset `FOR UPDATE`) |
| `GET` | `/api/v1/bookings` | ✅ Phase 1 |
| `GET` | `/api/v1/bookings/calendar` | ✅ Phase 3 |
| `POST` | `/api/v1/bookings/refresh-status` | ✅ Phase 3 (also 1‑min interval) |
| `POST` | `/api/v1/bookings/:id/cancel` | ✅ Phase 5 (owner or manager) |
| `PATCH` | `/api/v1/bookings/:id/reschedule` | ✅ Phase 5 (upcoming only; overlap excludes self) |
| `POST` | `/api/v1/bookings/emit-reminders` | ✅ Phase 5 (`reminder_sent` flag) |
| `POST` | `/api/v1/maintenance-requests` | ✅ Phase 2 |
| `GET` | `/api/v1/maintenance-requests` | ✅ Phase 2 (employees see own; includes asset status) |
| workflow | `/api/v1/maintenance-requests/:id/{approve,reject,assign,start,resolve}` | ✅ Phase 2 + **Phase 4 asset flips** |

## Hard rules

1. **Booking overlap** — half-open `[start, end)`: adjacent slots OK; true overlap → 422 `OVERLAP`.
2. **Maintenance gate (Rule 3)** — asset enters `Under_Maintenance` only on **approve** via Track B `transitionStatusTx` (same transaction as maint status). Resolve → `Available` (hackathon: always Available even if previously Allocated).

## Maintenance state machine

`pending` → `approved` | `rejected`  
`approved` → `technician_assigned` → `in_progress` → `resolved`  
`rejected` / `resolved` terminal. Illegal jumps → 422. Assign uses free-text `technician_name`.

## Depends on

- Track A: `requireAuth` / `requireRole`
- Track B: `assetService.transitionStatus` / `transitionStatusTx`
- Track D: `createNotification` / `logActivity`

## Tests

```bash
cd backend && npm test -- src/modules/operations
```
