# AssetFlow — Engineering & Agent Reference Guide

> **Purpose of this document.** This is the single source of truth for every human and AI agent building **AssetFlow — Enterprise Asset & Resource Management System**. Read the relevant section before writing code. Do not invent conventions that contradict this doc; if something is missing, propose an addition here first, get agreement, then build.

---

## 0. TL;DR for agents (read this first)

- **Stack:** Node 20 + Express 5 + TypeScript + Prisma + PostgreSQL (backend); React 19 + Vite + TS + Tailwind + shadcn/ui + TanStack Query (frontend).
- **Architecture:** feature-sliced modules. **All business rules live in `services/`, never in controllers or React components.**
- **The whole product hinges on 3 hard rules** (double-allocation block, booking-overlap reject, maintenance-approval gate). These MUST be correct and MUST have tests. Everything else is supporting cast.
- **Roles are never self-assigned.** Signup creates an `EMPLOYEE`. Only Admin promotes.
- **`main` is always runnable.** The demo runs off `main`.
- **Definition of Done** for any task: types shared, rule enforced in service, role-gated, UI reflects state, no broken build, smoke-tested.

---

## 1. Product overview

AssetFlow is an ERP platform for tracking, allocating, and maintaining physical assets and shared resources for any organization (offices, schools, hospitals, factories, agencies). It replaces spreadsheets/paper logs with structured asset lifecycles, centralized resource booking, maintenance approval workflows, and audit cycles — with real-time visibility into who holds what, where it is, and its condition.

**Explicitly out of scope:** purchasing, invoicing, accounting. Acquisition cost is stored for ranking/reports only, never linked to financial modules.

### The 10 screens (feature surface)
1. Login / Signup (Employee-only signup)
2. Dashboard / KPIs
3. Organization Setup (Admin) — Departments / Categories / Employee Directory
4. Asset Registration & Directory
5. Asset Allocation & Transfer
6. Resource Booking
7. Maintenance Management
8. Asset Audit
9. Reports & Analytics
10. Activity Logs & Notifications

---

## 2. The winning thesis

Judges reward **correct domain logic + coherent role-based UX + a demo that never breaks** — not infra sophistication. Therefore:

> Build **fewer things, fully.** All 10 screens exist, but 4 hero flows (allocation/transfer, booking, maintenance, audit) must be flawless and demoed live. The 3 hard rules are the differentiators — most teams fake them; we make them real and *show the rejection happening*.

**Do NOT build:** monorepo tooling, design-system package, microservices, mobile app, Kubernetes/complex Docker orchestration, refresh-token rotation, real email sending.

---

## 3. Tech stack (pinned)

### Backend
| Concern | Choice |
|---|---|
| Runtime | Node 20 LTS |
| Framework | Express 5 |
| Language | TypeScript (strict) |
| ORM | Prisma (`schema.prisma` = the ERD) |
| Auth | `jsonwebtoken` (JWT) + `bcrypt` |
| Validation | Zod (shared with frontend) |
| Hardening | `cors`, `helmet`, `morgan` |
| Tests | Jest + Supertest |
| Dev runner | `tsx watch` or `nodemon` |

### Frontend
| Concern | Choice |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix-based) |
| Data fetching | TanStack Query |
| Routing | React Router |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Calendar | FullCalendar |
| HTTP | axios (with a 409 interceptor) |

### Shared
- A `shared/` folder holds Zod schemas + enums (roles, statuses) imported by BOTH frontend and backend. **One source of truth for the domain.**

---

## 4. Repository structure

```
assetflow/
├── shared/                      # zod schemas + enums shared FE + BE
│   ├── enums.ts                 # Role, AssetStatus, BookingStatus, ...
│   └── schemas.ts               # zod request/response schemas
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # THE ERD (13 tables)
│   │   └── seed.ts              # 4 accounts + demo data
│   └── src/
│       ├── config/              # env, prisma client singleton
│       ├── middleware/          # auth (verify JWT), requireRole, errorHandler
│       ├── modules/             # feature-sliced ERP modules
│       │   ├── auth/            # auth.routes.ts, auth.controller.ts, auth.service.ts
│       │   ├── org/            # departments, categories, employees
│       │   ├── assets/
│       │   ├── allocations/     # allocate, transfer, return
│       │   ├── bookings/
│       │   ├── maintenance/
│       │   ├── audits/
│       │   └── notifications/
│       ├── services/            # BUSINESS RULES: assetStateMachine, conflictChecks
│       ├── lib/                 # activityLog(), notify(), errors, asyncHandler
│       ├── app.ts               # express app + middleware wiring
│       └── server.ts            # listen()
└── web/
    └── src/
        ├── api/                 # axios client + TanStack hooks per module
        ├── auth/                # AuthContext, ProtectedRoute, RoleGate
        ├── components/          # KpiCard, StatusBadge, DataTable, ConflictDialog
        ├── layouts/             # AppShell (role-aware sidebar)
        ├── pages/               # one folder per screen (10 screens)
        └── lib/                 # utils, formatters
```

**Module pattern (backend):** every module is `routes → controller → service`.
- `routes` = URL + middleware (`requireRole`) + Zod validation.
- `controller` = parse request, call service, shape response. **No business logic.**
- `service` = all business rules, DB access, state transitions.

---

## 5. Data model (ERD)

13 tables. This maps directly to `schema.prisma`.

| Table | Key fields |
|---|---|
| **users** | id, name, email (unique), passwordHash, role, departmentId?, status |
| **departments** | id, name, headUserId?, parentDepartmentId?, status |
| **categories** | id, name, customFields (JSON, e.g. `{ warrantyMonths: true }`) |
| **assets** | id, name, assetTag (auto `AF-0001`), serialNumber, categoryId, acquisitionDate, acquisitionCost, condition, location, status, isBookable, photoUrl?, currentHolderId? |
| **allocations** | id, assetId, holderType (`USER`\|`DEPARTMENT`), holderId, allocatedBy, allocatedAt, expectedReturnDate?, returnedAt?, checkinNotes?, status (`ACTIVE`\|`RETURNED`) |
| **transfer_requests** | id, assetId, fromHolderId?, toUserId, requestedBy, status (`REQUESTED`\|`APPROVED`\|`REJECTED`), approvedBy? |
| **bookings** | id, assetId, bookedBy, startTime, endTime, status (`UPCOMING`\|`ONGOING`\|`COMPLETED`\|`CANCELLED`) |
| **maintenance_requests** | id, assetId, raisedBy, issue, priority (`LOW`\|`MEDIUM`\|`HIGH`), status, approvedBy?, technician?, photoUrl? |
| **audit_cycles** | id, name, scopeType (`DEPARTMENT`\|`LOCATION`), scopeId?, startDate, endDate, status (`OPEN`\|`CLOSED`) |
| **audit_items** | id, cycleId, assetId, auditorId?, result (`PENDING`\|`VERIFIED`\|`MISSING`\|`DAMAGED`), notes? |
| **notifications** | id, userId, type, message, read (bool), createdAt |
| **activity_logs** | id, actorId, action, entityType, entityId, meta (JSON), createdAt |

> Relationships: a user belongs to a department; a department has a head (user) and optional parent; an asset belongs to a category and optionally has a current holder; allocations/bookings/maintenance/audit_items all reference an asset.

---

## 6. Enums & state machines

Define these once in `shared/enums.ts` and mirror in `schema.prisma`.

```ts
export enum Role { ADMIN = 'ADMIN', ASSET_MANAGER = 'ASSET_MANAGER', DEPT_HEAD = 'DEPT_HEAD', EMPLOYEE = 'EMPLOYEE' }
export enum AssetStatus { AVAILABLE='AVAILABLE', ALLOCATED='ALLOCATED', RESERVED='RESERVED', UNDER_MAINTENANCE='UNDER_MAINTENANCE', LOST='LOST', RETIRED='RETIRED', DISPOSED='DISPOSED' }
export enum BookingStatus { UPCOMING='UPCOMING', ONGOING='ONGOING', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }
export enum MaintenanceStatus { PENDING='PENDING', APPROVED='APPROVED', REJECTED='REJECTED', ASSIGNED='ASSIGNED', IN_PROGRESS='IN_PROGRESS', RESOLVED='RESOLVED' }
export enum TransferStatus { REQUESTED='REQUESTED', APPROVED='APPROVED', REJECTED='REJECTED' }
```

### Asset lifecycle (enforced by `transitionAsset()`)
```
AVAILABLE ──allocate──────────► ALLOCATED ──return──────────► AVAILABLE
AVAILABLE ──reserve(booking)──► RESERVED  ──slot ends───────► AVAILABLE
AVAILABLE ◄──resolve── UNDER_MAINTENANCE ◄──approve maint.── AVAILABLE
any ─────► LOST / RETIRED / DISPOSED   (audit close / admin action)
```

**Legal transitions only.** `transitionAsset(assetId, newStatus)` is the ONLY function permitted to write `asset.status`. It validates the transition is legal or throws `409`. No controller or other service writes `status` directly.

### Maintenance workflow
```
PENDING ─► APPROVED ─► ASSIGNED ─► IN_PROGRESS ─► RESOLVED
   └────► REJECTED
```
- On `APPROVED`: `transitionAsset(asset, UNDER_MAINTENANCE)`.
- On `RESOLVED`: `transitionAsset(asset, AVAILABLE)`.

### Transfer workflow
```
REQUESTED ─► APPROVED ─► (re-allocate: old allocation RETURNED, new allocation ACTIVE)
    └─────► REJECTED
```

### Booking lifecycle
```
UPCOMING ─► ONGOING ─► COMPLETED
    └─────► CANCELLED
```
(Status can be derived from `startTime`/`endTime`/now, or advanced by a lightweight cron/on-read computation. Keep it simple: compute on read.)

---

## 7. The 3 hard rules (MUST be correct + tested)

### Rule 1 — No double allocation
In `allocations/allocation.service.ts`, before creating an allocation:
```ts
if (asset.status === AssetStatus.ALLOCATED) {
  throw new ConflictError(409, {
    code: 'ASSET_ALREADY_HELD',
    heldBy: asset.currentHolder.name,
    assetTag: asset.assetTag,
    action: 'TRANSFER_REQUIRED',
  });
}
```
Frontend axios interceptor catches `409 ASSET_ALREADY_HELD` → opens `ConflictDialog` showing "Currently held by {heldBy}" + a **Request Transfer** button that POSTs a transfer request.

### Rule 2 — Booking overlap (half-open interval `[start, end)`)
```ts
const clash = await prisma.booking.findFirst({
  where: {
    assetId,
    status: { not: BookingStatus.CANCELLED },
    startTime: { lt: newEnd },   // existing starts before new ends
    endTime:   { gt: newStart }, // existing ends after new starts
  },
});
if (clash) throw new ConflictError(409, { code: 'BOOKING_OVERLAP', message: 'Time slot overlaps an existing booking' });
```
Test cases that MUST pass:
- Existing 09:00–10:00, request 09:30–10:30 → **REJECTED**
- Existing 09:00–10:00, request 10:00–11:00 → **ACCEPTED** (adjacent, half-open)

### Rule 3 — Maintenance approval gate
An asset may enter `UNDER_MAINTENANCE` **only** as a side effect of approving a maintenance request. Never via a direct status edit. Enforced because `transitionAsset` is the only writer and it's called inside `approveMaintenance()`.

**Required tests (Jest + Supertest):**
1. Double allocation → `409` with `heldBy` populated.
2. Overlap rejected; adjacent slot accepted.
3. Asset flips to `UNDER_MAINTENANCE` only after approval; a direct attempt is impossible/blocked.
4. `requireRole` blocks wrong-role access (e.g. Employee hitting an Asset-Manager route → `403`).

---

## 8. Roles & permissions

Signup payload **never** contains a role — the server forces `EMPLOYEE`. Only Admin promotes in the Employee Directory.

| Action | Admin | Asset Mgr | Dept Head | Employee |
|---|:--:|:--:|:--:|:--:|
| Org setup (depts/categories/employees) | ✅ | | | |
| Promote roles | ✅ | | | |
| Register assets | ✅ | ✅ | | |
| Allocate assets | ✅ | ✅ | | |
| Approve transfers | ✅ | ✅ | dept-scoped | |
| Approve maintenance | ✅ | ✅ | | |
| Approve returns / condition notes | ✅ | ✅ | | |
| Create audit cycle | ✅ | | | |
| Be an auditor (if assigned) | ✅ | ✅ | ✅ | ✅ |
| Book resources | ✅ | ✅ | ✅ (for dept) | ✅ |
| Raise maintenance | ✅ | ✅ | ✅ | ✅ |
| Initiate return/transfer request | ✅ | ✅ | ✅ | ✅ |
| View org analytics | ✅ | partial | dept-scoped | |

**Enforcement is double-layered:** `requireRole(...roles)` middleware on the backend AND `RoleGate`/conditional rendering on the frontend. Backend is the source of truth; UI gating is UX sugar.

---

## 9. API conventions

- **Base path:** `/api`. Resource-oriented: `/api/assets`, `/api/allocations`, `/api/bookings`, etc.
- **Auth:** `Authorization: Bearer <jwt>`. JWT payload: `{ sub: userId, role, departmentId }`.
- **Validation:** every write endpoint validates the body with a Zod schema from `shared/`.
- **Success shape:** return the resource or `{ data, meta }` for lists. Keep it consistent.
- **Error shape (uniform):**
```json
{ "error": { "code": "ASSET_ALREADY_HELD", "message": "…", "details": { } } }
```
- **Status codes:** `200/201` success, `400` validation, `401` unauthenticated, `403` wrong role, `404` not found, `409` conflict (the 3 hard rules), `500` unexpected.
- **Central error handler** in `middleware/errorHandler.ts` translates thrown `AppError`/`ConflictError` into the uniform shape. Controllers use an `asyncHandler` wrapper so no raw try/catch clutter.
- **Every state-changing action** calls `activityLog(actor, action, entity, meta)` and, where a user should be informed, `notify(userId, type, message)`.

---

## 10. Coding conventions

**General**
- TypeScript strict everywhere. No `any` unless justified with a comment.
- Shared enums/schemas imported from `shared/` — never redefine statuses inline.
- Names: `camelCase` vars/functions, `PascalCase` types/components, `SCREAMING_SNAKE` enum values.
- No business logic in controllers or React components. Services (BE) / hooks + api layer (FE).
- Comments only for non-obvious intent, not narration.

**Backend**
- One Prisma client singleton (`config/prisma.ts`). Never `new PrismaClient()` per request.
- `transitionAsset()` is the only writer of `asset.status`.
- Conflict checks live in `services/`, reused by controllers — not copy-pasted.

**Frontend**
- Server state via TanStack Query; local UI state via `useState`. Do not duplicate server state in Zustand/global unless needed.
- All API calls go through `api/` hooks; components never call axios directly.
- `StatusBadge` renders every status with a consistent color map. `ConflictDialog` handles all `409` UX.
- Role-gate actions with `RoleGate`; never show a button the user can't use.

---

## 11. Git workflow

- **`main` is always runnable.** The demo runs off `main`. Never merge a broken build.
- **Feature branches per task:** `feat/allocation-conflict`, `feat/booking-calendar`, `fix/overdue-flag`, `chore/seed-data`, `test/booking-overlap`.
- **Small PRs, fast reviews** (~15 min turnaround). No branch lives more than a few hours.
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`.
- **Freeze the contract early:** agree `shared/` enums + API response shapes in the first 30 minutes and don't churn them. Most merge pain is people inventing different field names.
- Whoever changes `schema.prisma`: migrate → **announce in team channel** → everyone pulls + re-seeds.

---

## 12. Dev workflow (local loop)

1. Postgres running (local install or `docker-compose up -d`).
2. `server/`: copy `.env.example` → `.env` (`DATABASE_URL`, `JWT_SECRET`), then `npx prisma migrate dev` → `npm run dev` (`:4000`).
3. `web/`: `npm run dev` (Vite `:5173`, proxy `/api` → `:4000`).
4. **Shared seed:** `npx prisma db seed` creates the 4 demo accounts + demo data so everyone develops against identical state. Reset anytime with `npx prisma migrate reset`.
5. Backend ships an endpoint → the owning frontend dev wires it the **same session**. Don't let API and UI drift.

**Seed accounts (all password `demo1234`):**
| Email | Role |
|---|---|
| `admin@assetflow.dev` | ADMIN |
| `manager@assetflow.dev` | ASSET_MANAGER |
| `depthead@assetflow.dev` | DEPT_HEAD |
| `employee@assetflow.dev` | EMPLOYEE |

Seed should also create: 2–3 departments, 3–4 categories, ~10 assets across statuses (incl. one already allocated for the conflict demo, one overdue, one bookable room), a couple of bookings, one maintenance request, and one audit cycle.

---

## 13. Test workflow (focused, not exhaustive)

- **Jest + Supertest** on the backend, targeting only what wins points: the 3 hard rules + `requireRole`. (See §7.)
- Run `npm test` before merging anything that touches `services/` or `middleware/`.
- **Skip frontend unit tests.** Real test = manual click-through per role. Keep this checklist green:
  - [ ] Employee cannot see/reach admin routes (UI hidden + API `403`)
  - [ ] No role dropdown at signup; new users are EMPLOYEE
  - [ ] Allocation block dialog appears with correct holder name
  - [ ] Transfer request → approve → history updates
  - [ ] Booking overlap rejected; adjacent slot accepted
  - [ ] Maintenance approve → asset flips to UNDER_MAINTENANCE → resolve → AVAILABLE
  - [ ] Overdue return shows on dashboard + notifications
  - [ ] Audit: mark Missing → discrepancy report → close cycle → asset LOST

---

## 14. Integration rhythm

- **Every ~6 hours: full-flow smoke test on `main`** — run the demo script (§16) start to finish. Catches broken wiring early instead of at hour 47.
- Keep a running `#status` note: what's merged, what's in flight, what's blocked.
- Re-seed before each smoke test for clean, predictable state.

---

## 15. Build order (dependency-correct)

Build in this order so nothing is blocked:
1. Auth + roles + AppShell (login, JWT, role-aware sidebar, 4 seeded accounts)
2. Org setup (departments → categories → employee directory + promote)
3. Asset registration + directory (auto tag, search/filter, status badges, per-asset history)
4. Allocation + transfer + return (**Rule 1**) ← hero flow
5. Booking (calendar + **Rule 2**) ← hero flow
6. Maintenance (**Rule 3**, workflow) ← hero flow
7. Audit cycles (create → assign → verify → discrepancy report → close) ← hero flow
8. Dashboard KPIs (now real) + Notifications/Activity log
9. Reports/Analytics (charts)
10. Polish, seed, demo script, tests

Screens 8–9 are last because they aggregate everything else.

### Team-of-4 split
| Dev | Owns | First 2 hours (unblock everyone) |
|---|---|---|
| **Dev 1 — Domain/Backend lead** | `schema.prisma`, `services/` (state machine + conflict rules), Jest tests | Ship the Prisma schema + migrate FAST — team is blocked until this lands |
| **Dev 2 — Backend API** | auth + JWT + `requireRole`, module routes/controllers, `seed.ts`, notifications + activity log | Build auth + middleware skeleton |
| **Dev 3 — Frontend core** | AppShell, AuthContext, ProtectedRoute/RoleGate, shared components, axios client + 409 interceptor | Build shell + login + shared components |
| **Dev 4 — Frontend screens** | Wire the 10 pages via TanStack hooks, forms, calendar, charts | Build Org Setup + Asset Directory first |

**Critical path (whole team blocks — do first):** Dev 1 schema (h~2) → Dev 2 auth + requireRole (h~3) → Dev 3 AppShell + login + DataTable + ConflictDialog (h~4).

---

## 16. Demo script (rehearse 3×)

A story, not a feature tour:
1. **Admin (Kabir)** logs in → creates dept "Engineering", category "Electronics" (warranty field), promotes Priya→Asset Manager, Raj→Dept Head. *"Notice: nobody picked their own role."*
2. **Asset Manager Priya** registers a laptop → auto tag `AF-0114`, status `AVAILABLE`.
3. Priya allocates `AF-0114` to employee **Anita**, return date in the past → dashboard **overdue** flag lights up.
4. **Money shot:** Raj tries to allocate `AF-0114` → **blocked**, "held by Anita," Transfer button → Raj requests transfer → Priya approves → history auto-updates. *(Rule 1)*
5. **Booking:** book Room B2 09:00–10:00, try 09:30–10:30 → **rejected**; try 10:00–11:00 → **accepted**. *(Rule 2)*
6. **Maintenance:** Anita raises a request → asset stays `AVAILABLE` → Priya approves → asset **auto-flips to UNDER_MAINTENANCE** → resolve → back to `AVAILABLE`. *(Rule 3)*
7. **Audit:** Admin opens a cycle, assigns auditor, marks an asset `MISSING` → **auto discrepancy report** → close cycle → asset becomes `LOST`.
8. **End on the Dashboard:** KPIs, overdue, notifications feed — *"every action you saw is reflected here in real time and logged in the activity trail."*
9. Flash **passing tests** for 5 seconds: *"the conflict rules are unit-tested."*

---

## 17. Demo-hardening (last ~5 hours)

- **Freeze features.** Only bug fixes to `main`.
- `npx prisma migrate reset && npx prisma db seed` → pristine demo data.
- One owner runs the 5-minute script 3× and **screen-records one clean take** as backup if live fails.
- Prep fallback: have API docs / Postman collection and passing tests ready if the UI hiccups.

---

## 18. Scope cuts (decide early, protect the hero flows)

Cut in this order if behind:
1. Reports charts → 2 simple summary cards
2. Photo/document upload → URL text field
3. QR scan → QR display only, search by tag
4. Parent-department hierarchy → flat departments
5. Reschedule booking → cancel + rebook
6. Refresh-token rotation → single access token

**Never cut:** the 3 hard rules, role gating, seed data, demo rehearsal.

---

## 19. Definition of Done (per task)

A task is done only when ALL are true:
- [ ] Types/enums come from `shared/`, not redefined
- [ ] Business rule (if any) is enforced in a `service`, not a controller/component
- [ ] Endpoint is role-gated with `requireRole` (backend) + `RoleGate` (frontend)
- [ ] Request body validated with Zod
- [ ] State changes go through `transitionAsset()` where asset status is involved
- [ ] Action is logged (`activityLog`) and notifies affected users where relevant
- [ ] UI reflects the resulting state (status badge, list refresh via query invalidation)
- [ ] `main` still builds and runs; smoke path unbroken
- [ ] If it touches a hard rule → a Jest test covers it

---

## 20. Quick reference — one-line summary

Admin sets up org + roles → Asset Manager registers & allocates assets (conflicts blocked, transfers required) → employees book/maintain/return (overlaps rejected, maintenance approval-gated) → audits verify and flag discrepancies → dashboard, notifications, and activity logs keep every role informed in real time. Built as feature-sliced Express+Prisma modules with all rules in `services/`, a React+shadcn role-aware frontend, guarded by Jest tests on the 3 hard rules, integrated continuously on an always-runnable `main`.
