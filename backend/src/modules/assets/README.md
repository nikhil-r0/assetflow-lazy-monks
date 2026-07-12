# Track B — Assets module

**Owner:** Track B (feature branch `feature/assets-allocation`)  
**Screens:** 4 (Asset Registration & Directory), 5 (Allocation & Transfer)

## Status (early scaffold)

| Piece | Status |
|---|---|
| Module mount `GET /api/v1/assets/ping` | ✅ |
| Zod placeholders (`createAsset`, `allocate`) | ✅ |
| Service stubs (NotImplemented) | ✅ |
| Pure `transitionStatusPure` / `canTransition` | ✅ (ready for C/D) |
| `buildAlreadyAllocatedConflict` 409 shape | ✅ |
| Prisma CRUD / allocate / transfer | ⏳ blocked on Track A auth + categories |

## Endpoints (planned)

See `BUILD_SPEC.md` Track B Phases 1–5. Do not invent routes outside that list.

## Hard rule owned here

**Rule 1 — No double allocation:** at most one `allocations` row with `status=active` per asset. Conflict response must include `holder_name` for the Transfer CTA.

## Frozen export for other tracks

```ts
import { assetService } from "./assets.service.js";
// C/D call: assetService.transitionStatus(assetId, to, actorId, reason?)
// Until DB wrapper lands, import transitionStatusPure from assetStatus.ts for unit tests.
```
