# AssetFlow — Engineering & Agent Reference Guide

> **Purpose.** Fast orientation for humans and AI agents. **If anything here disagrees with `BUILD_SPEC.md`, `BUILD_SPEC.md` wins.** Do not invent conventions that contradict either doc; propose an addition to `BUILD_SPEC.md` first.

### Document canon
| Doc | Role |
|---|---|
| `BUILD_SPEC.md` | **Implementation authority** (stack, schema, RBAC, APIs, phases, tests, seed) |
| **This file** | Winning thesis, 3 hard rules, DoD, demo script, coding conventions |
| `AssetFlow_Hackathon_Plan.md` | 8-hour schedule + A/B/C/D ownership |

---

## 0. TL;DR for agents

- **Stack (pinned in BUILD_SPEC §0.1):** Node 20 + Express 4 + TypeScript + Prisma + PostgreSQL; React 18 + Vite + TanStack Query + Tailwind; Vitest + Supertest; npm workspaces (`backend/` + `frontend/`).
- **Architecture:** feature-sliced modules under `backend/src/modules/{auth,assets,operations,insights}`. **Business rules live in `*.service.ts`, never in controllers or React components.**
- **The product hinges on 3 hard rules** (double-allocation block, booking-overlap reject, maintenance-approval gate). These MUST be correct and MUST have tests.
- **Roles are never self-assigned.** Signup creates `employee`. Only Admin promotes in Employee Directory.
- **`main` is always runnable** (demo). Integration lands on `develop` first (see BUILD_SPEC §0.9).
- **Definition of Done:** types shared, rule enforced in service, role-gated, UI reflects state, verify green, smoke-tested.

---

## 1. Product overview

AssetFlow is an ERP for tracking, allocating, and maintaining physical assets and shared resources for any organization (offices, schools, hospitals, factories, agencies). It replaces spreadsheets/paper with structured lifecycles, booking, maintenance approval, and audit cycles — with real-time visibility into who holds what, where it is, and its condition.

**Explicitly out of scope:** purchasing, invoicing, accounting; forgot-password email flows (seeded demo accounts); multipart uploads (URL strings only). Acquisition cost is for ranking/reports only.

### The 10 screens
1. Login / Signup (Employee-only signup — no role picker)
2. Dashboard / KPIs (Available, Allocated, Maintenance Today, Active Bookings, Pending Transfers, Upcoming Returns + separate Overdue)
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

Judges reward **correct domain logic + believable role-based UX + a demo that never breaks** — not infra sophistication.

> Build **fewer things, fully.** All 10 screens exist, but 4 hero flows (allocation/transfer, booking, maintenance, audit) must be flawless and demoed live. The 3 hard rules are the differentiators — most teams fake them; we make them real and *show the rejection happening*.

**Do NOT build:** design-system packages, microservices, mobile app, Kubernetes, refresh-token rotation, real email sending, forgot-password.

---

## 3. Tech stack (must match BUILD_SPEC §0.1)

| Layer | Choice |
|---|---|
| Backend | Node 20, Express ^4.19, TypeScript, Prisma, PostgreSQL 16 |
| Auth | `jsonwebtoken` + `bcryptjs` |
| Validation | zod |
| Backend tests | Vitest + Supertest |
| Frontend | React ^18 + Vite + react-router-dom + TanStack Query + Tailwind + axios |
| Frontend tests | Vitest + Testing Library |
| Monorepo | npm workspaces: `backend/`, `frontend/` |
| API base | `/api/v1` |

Optional UI helpers (not required by BUILD_SPEC): Recharts (reports), a calendar component for bookings. Prefer simple Tailwind components over inventing a design system.

---

## 4. Repository structure (BUILD_SPEC §0.4)

```
assetflow-lazy-monks/
├── docs/ER_DIAGRAM.dbml
├── docs/API_CONTRACT.md
├── backend/
│   ├── prisma/schema.prisma      # THE ERD (16 tables) — track banners A/B/C/D
│   └── src/
│       ├── shared/               # enums, errors, auth, activity, notify, pagination
│       └── modules/
│           ├── auth/             # Track A — auth, org, departments, categories, users
│           ├── assets/           # Track B — assets, allocations, transfers
│           ├── operations/       # Track C — bookings, maintenance
│           └── insights/         # Track D — dashboard, audit, reports, notif, logs
└── frontend/src/pages/{auth,org,assets,ops,insights}/
```

**Module pattern:** `routes → service` (+ zod schema + tests). Controllers optional; **no business logic outside services.**

---

## 5. Data model

**16 tables** — full column specs in BUILD_SPEC §0.2. Quick map:

| Table | Purpose |
|---|---|
| users, departments, asset_categories, category_custom_fields | Org master data |
| assets, asset_documents | Registry + docs (URL strings) |
| allocations, transfer_requests | Who holds what + transfer workflow |
| bookings | Time-slot resource booking |
| maintenance_requests | Approval-gated repairs |
| audit_cycles, audit_cycle_auditors, audit_items | Structured audit cycles |
| notifications, activity_logs | Alerts + audit trail |

Asset statuses: `Available | Allocated | Reserved | Under_Maintenance | Lost | Retired | Disposed` (UI label for Under_Maintenance = "Under Maintenance").

---

## 6. Enums & state machines (Prisma casing — BUILD_SPEC §0.2.16)

```
Role:            admin | asset_manager | department_head | employee
AssetStatus:     Available | Allocated | Reserved | Under_Maintenance | Lost | Retired | Disposed
AllocStatus:     active | returned | overdue
TransferStatus:  requested | approved | rejected | completed
BookingStatus:   upcoming | ongoing | completed | cancelled
MaintStatus:     pending | approved | rejected | technician_assigned | in_progress | resolved
Priority:        low | medium | high | critical
AuditStatus:     open | closed
AuditResult:     verified | missing | damaged
```

### Asset lifecycle (via central `transitionStatus` only)
```
Available ──allocate──────────► Allocated ──return──────────► Available
Available ──book (bookable)───► Reserved  ──last booking ends► Available
Available/Allocated ──approve maint──► Under_Maintenance ──resolve──► Available
any (rules in BUILD_SPEC) ────► Lost / Retired / Disposed
```

### Maintenance
`pending → approved → technician_assigned → in_progress → resolved` (or `pending → rejected`).  
On **approved**: asset → `Under_Maintenance`. On **resolved**: asset → `Available`.

### Transfer
`requested → approved → completed` (re-allocate atomically) or `requested → rejected`.

### Booking
Status derived/refreshed from time; overlap uses half-open `[start, end)`.

---

## 7. The 3 hard rules (MUST be correct + tested)

### Rule 1 — No double allocation
Before creating an allocation: if an `active` row exists for that `asset_id` → **409 CONFLICT** with holder name + `already_allocated`. UI opens conflict banner + **Request Transfer**.

### Rule 2 — Booking overlap (half-open `[start, end)`)
Existing 09:00–10:00 + request 09:30–10:30 → **REJECTED**.  
Existing 09:00–10:00 + request 10:00–11:00 → **ACCEPTED**.

### Rule 3 — Maintenance approval gate
Asset enters `Under_Maintenance` **only** as a side effect of approving a maintenance request — never via casual status edit from the holder.

**Required tests (Vitest + Supertest):** double-alloc 409; overlap reject / adjacent accept; Under_Maintenance only after approve; wrong role → 403.

---

## 8. Roles & permissions

Matches BUILD_SPEC §0.8 and the product brief:

| Action | Admin | Asset Mgr | Dept Head | Employee |
|---|:--:|:--:|:--:|:--:|
| Org setup + promote roles | ✅ | | | |
| Register / allocate assets | ✅ | ✅ | | |
| Approve transfers (dept-scoped for head) | ✅ | ✅ | ✅ | |
| Approve returns / check-in | ✅ | ✅ | | |
| Create audit cycle + assign auditors | ✅ | | | |
| Close cycle / discrepancy resolution | ✅ | ✅ | | |
| Book / raise maintenance / request transfer | ✅ | ✅ | ✅ | ✅ |
| View analytics | org | org | dept | self |

**Enforcement:** `requireRole` on backend + route/UI gating. Backend is source of truth.

---

## 9. API conventions (BUILD_SPEC §0.3)

- Base: `/api/v1`
- Auth: `Authorization: Bearer <jwt>` — payload `{ sub, role, department_id, iat, exp }`, 8h
- Errors: `{ "error": { "code", "message", "details?" } }`
- Conflicts that win demos: **409** double-allocation; **422 OVERLAP** booking clash
- Every state-changing action: `logActivity` + `createNotification` where a user should know

---

## 10. Coding conventions

- TypeScript strict. No `any` without a comment.
- Shared enums/labels from `backend/src/shared/enums.ts` (and mirrored constants for FE).
- `transitionStatus()` is the **only** writer of `asset.status`.
- FE: TanStack Query for server state; axios only via `api/client.ts`; StatusBadge + conflict UX for 409s.
- Never show a button the user's role cannot use.

---

## 11. Git workflow (BUILD_SPEC §0.9)

```
main  ← fast-forward from develop at 2h checkpoints (tags v1..v4)
 └─ develop  ← feature branches merge here hourly
     ├─ feature/auth-orgsetup        (A)
     ├─ feature/assets-allocation    (B)
     ├─ feature/booking-maintenance  (C)
     └─ feature/audit-reports        (D)
```

Conventional commits: `feat(assets): …`. Run `npm run verify` before merging to `develop`.

---

## 12. Dev workflow

1. `docker compose up -d` (Postgres 16)
2. `backend/`: `.env` from `.env.example` → `npx prisma migrate dev` → `npm run dev` (`:4000`)
3. `frontend/`: `npm run dev` (`:5173`, proxy `/api` → backend)
4. Seed: `npx prisma db seed` — credentials in BUILD_SPEC §4.3 (`Passw0rd!`)

| Email | Role |
|---|---|
| admin@assetflow.dev | admin |
| manager@assetflow.dev | asset_manager |
| head@assetflow.dev | department_head |
| priya@assetflow.dev | employee |
| raj@assetflow.dev | employee |

---

## 13. Test focus

Vitest + Supertest on the 3 hard rules + RBAC. Manual click-through checklist:

- [ ] No role dropdown at signup; new users are `employee`
- [ ] Employee cannot reach admin routes (UI + API 403)
- [ ] Allocation block shows correct holder + Transfer CTA
- [ ] Transfer approve → history updates
- [ ] Booking overlap rejected; adjacent accepted
- [ ] Maintenance approve → Under Maintenance → resolve → Available
- [ ] Overdue return on dashboard + notification
- [ ] Audit Missing → discrepancy report → close → Lost

---

## 14. Team split (BUILD_SPEC tracks)

| Track | Owns | Screens |
|---|---|---|
| **A — Auth/Org** | Auth, RBAC, Org Setup | 1, 3 |
| **B — Assets** | Registry, Allocation, Transfer, Overdue | 4, 5 |
| **C — Operations** | Booking, Maintenance | 6, 7 |
| **D — Insights** | Dashboard, Audit, Reports, Notif/Logs | 2, 8, 9, 10 |

Critical path: A schema+auth → B `transitionStatus` → C maintenance status flips / D audit close.

---

## 15. Demo script (rehearse 3×)

1. **Admin** → Org Setup: dept, Electronics + warranty field, promote manager/head. *"Nobody picked their own role."*
2. **Asset Manager** registers laptop → `AF-0xxx` Available.
3. Allocate to Priya with past return date → Dashboard **overdue**.
4. **Money shot:** allocate same asset to Raj → **blocked**, held by Priya → Transfer → approve → history updates. *(Rule 1)*
5. **Booking:** Room B2 09:00–10:00; try 09:30–10:30 → reject; 10:00–11:00 → accept. *(Rule 2)*
6. **Maintenance:** raise → still Available until approve → **Under Maintenance** → resolve → Available. *(Rule 3)*
7. **Audit:** mark Missing → discrepancy report → close → **Lost**.
8. End on **Dashboard + Notifications + Activity log**. Flash passing hard-rule tests.

Full walkthrough with seed data: BUILD_SPEC §4.4.

---

## 16. Scope cuts (if behind — protect hero flows)

1. Reports charts → summary tables  
2. Photo/docs → URL text field (already the default)  
3. QR scan → display + search by tag  
4. Parent-department hierarchy → flat depts  
5. Reschedule → cancel + rebook  
6. Forgot password → never planned  

**Never cut:** 3 hard rules, role gating, seed data, demo rehearsal.

---

## 17. Definition of Done (per task)

- [ ] Matches BUILD_SPEC phase acceptance criteria
- [ ] Business rule in service; endpoint `requireRole`-gated
- [ ] Zod-validated body; asset status via `transitionStatus` when relevant
- [ ] `logActivity` / `createNotification` where specified
- [ ] UI reflects state; `develop` still verifies
- [ ] Hard-rule change → Vitest coverage

---

## 18. One-line summary

Admin sets up org + roles → Asset Manager registers & allocates (conflicts blocked, transfers required) → employees book/maintain/return (overlaps rejected, maintenance approval-gated) → audits verify discrepancies → dashboard, notifications, and logs keep every role informed. Built as Express+Prisma feature modules with rules in services, React role-aware UI, Vitest on the 3 hard rules, integrated on `develop`, demoed from always-runnable `main`.
