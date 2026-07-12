# Track B — Assets module

**Owner:** Track B · Branch pattern: `feature/assets-*`  
**Screens:** 4 (Registry), 5 (Allocation & Transfer)

## Status

| Piece | Status |
|---|---|
| `GET /api/v1/assets/ping` | ✅ |
| `transitionStatusPure` / `canTransition` | ✅ |
| `formatAssetTag` / `placeholderAssetTag` | ✅ |
| `validateCustomFields` | ✅ |
| 409 `buildAlreadyAllocatedConflict` | ✅ |
| FE shells Registry / AssetForm / Allocation | ✅ |
| Prisma client generate | ⏳ Track A Prisma 7 datasource fix |
| CRUD / allocate APIs | ⏳ Track A auth + categories |

## Tests

```bash
cd backend && npm test
```

## Frozen export for C/D

```ts
import { assetService } from "./assets.service.js";
// assetService.transitionStatus(assetId, to, actorId, reason?)
// Until DB: assetService.transitionStatusPure(from, to)
```
