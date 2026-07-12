# AssetFlow — 8-Hour Build Plan (4-person team)

> **Canon:** `BUILD_SPEC.md` (local) = how to build. **`STATUS.md`** = what’s done. **`ASSETFLOW.md`** = how to win.  
> If this plan disagrees with BUILD_SPEC → follow BUILD_SPEC.

---

## 1. Why schema-first
Lock one ERD before models diverge. Authoritative schema: **`backend/prisma/schema.prisma`** (also BUILD_SPEC §0.2). Budget 30–40 min hour-0 sync — **already largely done** (full Prisma schema on `develop`).

---

## 2. Core schema (whiteboard reminder)

Tables already in Prisma:  
`users`, `departments`, `asset_categories`, `category_custom_fields`, `assets`, `asset_documents`, `allocations`, `transfer_requests`, `bookings`, `maintenance_requests`, `audit_cycles`, `audit_cycle_auditors`, `audit_items`, `notifications`, `activity_logs`.

**Circular FK:** `departments.head_user_id` ↔ `users.department_id` — both nullable; create dept → users → backfill head.

Full field list: BUILD_SPEC §0.2 / `schema.prisma`.

---

## 3. Module split (4 people)

| Person | Track | Screens | Owns | Depends on | Status |
|---|---|---|---|---|---|
| **A** | Auth/Org | 1, 3 | Signup/login/JWT, Org Setup 3 tabs, promote roles | — | Schema ✅ · Auth ⏳ **unblocker** |
| **B** | Assets | 4, 5 | Registry, allocate/return, transfer, overdue, **Rule 1** | A auth + categories | **Phase 0 scaffold ✅** |
| **C** | Ops | 6, 7 | Booking **Rule 2**, Maintenance **Rule 3** | A auth + B `transitionStatus` | Not started |
| **D** | Insights | 2, 8–10 | Dashboard, audit, reports, notif/logs | B/C data; helpers early | Not started |

**Role reminder:** Signup → `employee` only. Admin promotes. **Only Admin + Asset Manager allocate.** Dept Head **approves** dept transfers. Admin creates audit cycles; Asset Manager can close. Forgot-password out of scope.

**Why this split:** A is the only true blocker. B’s state machine unblocks C/D. D can stub KPIs at zero early.

---

## 4. Git workflow

```
main     ← tagged checkpoints from develop (demo-safe)
 └─ develop
     ├─ feature/auth-orgsetup        (A)
     ├─ feature/assets-allocation    (B)  ← active
     ├─ feature/booking-maintenance  (C)
     └─ feature/audit-reports        (D)
```

Hourly: commit on feature branch → PR → `develop` after smoke.  
Do **not** commit `BUILD_SPEC.md` (gitignored). Keep a local copy.

---

## 5. Hour-by-Hour Plan

| Hour | Everyone | A | B | C | D |
|---|---|---|---|---|---|
| 0–1 | Schema lock (✅ done), branches | Migrations + health | Phase 0 scaffold (✅) | Scaffold ops stubs | Scaffold insights + notif helpers |
| 1–2 | Merge to `develop` | Auth JWT + requireRole | Draft tag gen / forms against contract | Overlap pure logic + tests | Notif/activity helpers live |
| 2–3 | Tag `v1` | Org Setup UI | Asset CRUD + search | Maint state machine | KPI stubs (zeros OK) |
| 3–4 | Hourly commit | Wire middleware for all | Allocation + **409 conflict** | Booking calendar | Audit cycle create |
| 4–5 | Tag `v2` | Integration support | Transfer workflow | Maint → status flip (needs B) | Verify + discrepancy |
| 5–6 | Hourly commit | RBAC polish | Overdue flagging | Cancel/reschedule/reminders | Reports queries |
| 6–7 | Tag `v3`, integrate | RBAC sweep | Conflict edge cases live | Overlap live | Wire real KPIs + notifs |
| 7–8 | Tag `v4`, demo | — | — | — | — |

---

## 6. Judging checklist
- Commits: `feat(assets): …` scoped by module  
- `docs/ER_DIAGRAM.dbml` filled (A)  
- Module `README.md` per folder (B assets README ✅)  
- Smoke before merge to `develop`  
- **Demo the 3 hard rules live** (ASSETFLOW §8 / BUILD_SPEC §4.4)  
- Screen → phase map at end of BUILD_SPEC  

---

## 7. Track B — what “early parts” means (done)

On branch `feature/assets-allocation`:

- Express `createApp` + `GET /api/v1/assets/ping`
- Zod placeholders, service stubs (`NotImplemented`)
- `transitionStatusPure` / `canTransition` (legal edges)
- `buildAlreadyAllocatedConflict` (409 + holder name)
- Vitest: 6 tests green (`npm test` in `backend/`)

**Blocked for Phase 1+:** Track A auth middleware + categories API.
