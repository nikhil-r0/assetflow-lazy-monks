# Track C — Operations module

**Owner:** Track C · Branch: `feature/booking-maintenance`  
**Screens:** 6 (Resource Booking), 7 (Maintenance)

## Endpoints

| Method | Path | Status |
|---|---|---|
| `GET` | `/api/v1/operations/ping` | ✅ Phase 0 |
| `POST` | `/api/v1/bookings` | Phase 1 |
| `GET` | `/api/v1/bookings` | Phase 1 |
| `POST` | `/api/v1/maintenance-requests` | Phase 2 |
| workflow | `/api/v1/maintenance-requests/:id/{approve,reject,assign,start,resolve}` | Phase 2 |

## Hard rules

1. **Booking overlap** — half-open `[start, end)`: adjacent slots OK; true overlap → 422 `OVERLAP`.
2. **Maintenance gate** — asset enters `Under_Maintenance` only on approve (Phase 4, via Track B `transitionStatus`).

## Depends on

- Track A: `requireAuth` / `requireRole` (header fallback OK for parallel work)
- Track B: `assetService.transitionStatus` for Phase 4 status flips
- Track D: `createNotification` / `logActivity` in `shared/`

## Tests

```bash
cd backend && npm test
```
