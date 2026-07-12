# AssetFlow — Build Specification (Antigravity Implementation Spec)

> **Reader = an AI coding agent with zero prior context.** Every instruction here is authoritative for *how to build*. Do not invent requirements. If two instructions inside this file conflict, Section 0 wins.

### Document canon (read first)
| Doc | Role |
|---|---|
| **This file (`BUILD_SPEC.md`)** | **Implementation authority** — stack, schema, RBAC, APIs, phases, tests, demo seed |
| `ASSETFLOW.md` | Agent quick-ref (winning thesis, hard rules, DoD, demo script) — **must not contradict this file** |
| `AssetFlow_Hackathon_Plan.md` | 8-hour schedule + module ownership — **must not contradict this file** |
| Product goal (vision / 10 screens / roles) | *What* we ship — summarized in §0.0 below |

---

## 0. Global Reference (shared by all 4 tracks)

### 0.0 Product goal (must match the shipped app)

**Vision:** Digitize how any organization tracks, allocates, and maintains physical assets and shared resources (offices, schools, hospitals, factories, agencies) via a centralized ERP — **not** purchasing, invoicing, or accounting.

**Mission (hackathon):** User-centric, responsive app with clean modular architecture, realistic RBAC (no self-assigned admin), and the full asset/resource lifecycle.

**10 screens (all required):**
1. Login / Signup — Employee-only signup; no role picker
2. Dashboard — KPIs + overdue vs upcoming returns + quick actions
3. Organization Setup (Admin) — Departments / Categories / Employee Directory (sole role-promotion surface)
4. Asset Registration & Directory — auto tag `AF-0001`, search, lifecycle, history
5. Asset Allocation & Transfer — double-allocation block → Transfer Request
6. Resource Booking — calendar + half-open overlap reject
7. Maintenance Management — approval gate before Under Maintenance
8. Asset Audit — cycles, auditors, Verified/Missing/Damaged, discrepancy report, close→Lost
9. Reports & Analytics — utilization, maintenance frequency, due-for-attention, dept allocation, booking heatmap, CSV export
10. Activity Logs & Notifications

**Roles (authoritative — mirrors §0.8):**
| Role | Does |
|---|---|
| **Admin** | Org setup, category/dept CRUD, promote roles, audit cycles, org-wide analytics |
| **Asset Manager** | Register/allocate assets; approve transfers, returns/check-in, maintenance; resolve audit discrepancies / close cycles |
| **Department Head** | View dept assets; **approve** (not initiate) transfers/allocations in own dept; book resources for dept |
| **Employee** | View own assets; book; raise maintenance; initiate return/transfer requests |

**Signup creates Employee only.** Admin promotes Department Head / Asset Manager **only** in Employee Directory (Screen 3 Tab C).

**Explicitly out of scope (do not build):** purchasing, invoicing, accounting modules; **forgot-password / email reset** (demo uses seeded accounts + Admin deactivation); multipart file upload (URL strings only); refresh-token rotation; microservices / K8s.

---

### 0.1 Chosen Tech Stack (single stack — DO NOT mix frameworks)

| Layer | Choice | Version pin |
|---|---|---|
| Language (backend + frontend) | **TypeScript** | ^5.4 |
| Backend runtime | **Node.js** | >= 20 LTS |
| Backend framework | **Express** | ^4.19 |
| ORM / migrations | **Prisma** | ^5.15 |
| Database | **PostgreSQL** | 16 |
| Auth | **JWT** (`jsonwebtoken`) + `bcryptjs` | jsonwebtoken ^9, bcryptjs ^2.4 |
| Validation | **zod** | ^3.23 |
| Backend tests | **Vitest** (unit) + **Supertest** (integration) | vitest ^1.6, supertest ^7 |
| Frontend framework | **React** + **Vite** | react ^18, vite ^5 |
| Frontend routing | **react-router-dom** | ^6 |
| Frontend data fetching | **@tanstack/react-query** | ^5 |
| Frontend styling | **Tailwind CSS** | ^3.4 |
| Frontend HTTP client | **axios** | ^1.7 |
| Frontend component tests | **Vitest** + **@testing-library/react** | RTL ^16 |
| Package manager | **npm workspaces** (monorepo) | npm >= 10 |

**Hard rules:**
- All timestamps stored as PostgreSQL `timestamptz`, always UTC.
- All IDs are integer autoincrement (`Int @id @default(autoincrement())`) unless stated. (Simpler for hackathon; avoids UUID boilerplate.)
- One shared Prisma schema file (`backend/prisma/schema.prisma`) is the single source of truth for the DB. **Only Track A creates the initial migration; other tracks add migrations for their own tables in their assigned phase, appending models to the same schema file.** To avoid merge conflicts, each track owns a contiguous block of the schema file demarcated by comment banners (see 0.4).
- Money (`acquisition_cost`) stored as `Decimal @db.Decimal(12,2)`.

### 0.2 Full Database Schema

All enums are Prisma enums. Creation order resolves the circular FK (see 0.2.14).

#### 0.2.1 `users`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| name | String(120) | no | | |
| email | String(160) | no | | **UNIQUE** |
| password_hash | String(255) | no | | bcrypt hash |
| role | enum Role | no | `employee` | admin \| asset_manager \| department_head \| employee |
| department_id | Int FK→departments.id | **yes** | null | `ON DELETE SET NULL` |
| status | enum UserStatus | no | `active` | active \| inactive |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([department_id])`, `@@index([role])`. Unique: `email`.

#### 0.2.2 `departments`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| name | String(120) | no | | **UNIQUE** |
| parent_department_id | Int FK→departments.id | yes | null | self-ref, `ON DELETE SET NULL` |
| head_user_id | Int FK→users.id | **yes** | null | `ON DELETE SET NULL` |
| status | enum DeptStatus | no | `active` | active \| inactive |

Indexes: `@@index([parent_department_id])`, `@@index([head_user_id])`. Unique: `name`.

#### 0.2.3 `asset_categories`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| name | String(80) | no | | **UNIQUE** |

#### 0.2.4 `category_custom_fields`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| category_id | Int FK→asset_categories.id | no | | `ON DELETE CASCADE` |
| field_name | String(80) | no | | |
| field_type | enum FieldType | no | `text` | text \| number \| date \| boolean |

Unique: `@@unique([category_id, field_name])`. Index: `@@index([category_id])`.

#### 0.2.5 `assets`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| asset_tag | String(20) | no | | **UNIQUE**, format `AF-0001` (see 0.6) |
| name | String(160) | no | | |
| category_id | Int FK→asset_categories.id | no | | `ON DELETE RESTRICT` |
| serial_number | String(120) | yes | null | |
| acquisition_date | date | yes | null | |
| acquisition_cost | Decimal(12,2) | yes | null | reports only, no accounting |
| condition | String(60) | yes | null | free text (e.g. New/Good/Fair/Poor) |
| location | String(160) | yes | null | |
| custom_fields | Json | yes | null | key→value per category_custom_fields |
| is_bookable | Boolean | no | false | |
| qr_code | String(255) | yes | null | encodes asset_tag |
| status | enum AssetStatus | no | `Available` | see 0.2.15 |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([category_id])`, `@@index([status])`, `@@index([location])`, `@@index([serial_number])`. Unique: `asset_tag`.

#### 0.2.6 `asset_documents`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| asset_id | Int FK→assets.id | no | | `ON DELETE CASCADE` |
| file_url | String(500) | no | | |
| doc_type | String(60) | yes | null | e.g. photo/invoice/warranty |

Index: `@@index([asset_id])`.

#### 0.2.7 `allocations`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| asset_id | Int FK→assets.id | no | | `ON DELETE RESTRICT` |
| employee_id | Int FK→users.id | yes | null | `ON DELETE SET NULL` |
| department_id | Int FK→departments.id | yes | null | `ON DELETE SET NULL` |
| allocated_date | timestamptz | no | now() | |
| expected_return_date | date | yes | null | |
| actual_return_date | timestamptz | yes | null | |
| status | enum AllocStatus | no | `active` | active \| returned \| overdue |
| condition_notes_out | String(500) | yes | null | |
| condition_notes_in | String(500) | yes | null | |

Indexes: `@@index([asset_id])`, `@@index([employee_id])`, `@@index([department_id])`, `@@index([status])`.
**Partial-unique rule (enforced in app logic, see Track B Phase 3):** at most one `allocations` row per `asset_id` with `status='active'`.

#### 0.2.8 `transfer_requests`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| asset_id | Int FK→assets.id | no | | `ON DELETE CASCADE` |
| from_user_id | Int FK→users.id | yes | null | current holder; nullable if dept-held |
| to_user_id | Int FK→users.id | no | | requested new holder |
| requested_by | Int FK→users.id | no | | |
| approved_by | Int FK→users.id | yes | null | |
| status | enum TransferStatus | no | `requested` | requested \| approved \| rejected \| completed |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([asset_id])`, `@@index([status])`.

#### 0.2.9 `bookings`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| resource_asset_id | Int FK→assets.id | no | | `ON DELETE CASCADE` |
| booked_by_user_id | Int FK→users.id | no | | `ON DELETE RESTRICT` |
| department_id | Int FK→departments.id | yes | null | `ON DELETE SET NULL` |
| start_time | timestamptz | no | | |
| end_time | timestamptz | no | | |
| status | enum BookingStatus | no | `upcoming` | upcoming \| ongoing \| completed \| cancelled |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([resource_asset_id, start_time, end_time])`, `@@index([status])`.

#### 0.2.10 `maintenance_requests`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| asset_id | Int FK→assets.id | no | | `ON DELETE CASCADE` |
| raised_by | Int FK→users.id | no | | `ON DELETE RESTRICT` |
| issue_description | String(1000) | no | | |
| priority | enum Priority | no | `medium` | low \| medium \| high \| critical |
| photo_url | String(500) | yes | null | |
| status | enum MaintStatus | no | `pending` | pending \| approved \| rejected \| technician_assigned \| in_progress \| resolved |
| approved_by | Int FK→users.id | yes | null | |
| technician_name | String(120) | yes | null | |
| created_at | timestamptz | no | now() | |
| resolved_at | timestamptz | yes | null | |

Indexes: `@@index([asset_id])`, `@@index([status])`.

#### 0.2.11 `audit_cycles`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| name | String(160) | no | | |
| scope_department_id | Int FK→departments.id | yes | null | `ON DELETE SET NULL` |
| scope_location | String(160) | yes | null | |
| start_date | date | no | | |
| end_date | date | no | | |
| status | enum AuditStatus | no | `open` | open \| closed |
| created_by | Int FK→users.id | no | | `ON DELETE RESTRICT` |

Index: `@@index([status])`.

#### 0.2.12 `audit_cycle_auditors`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| audit_cycle_id | Int FK→audit_cycles.id | no | | `ON DELETE CASCADE` |
| auditor_user_id | Int FK→users.id | no | | `ON DELETE CASCADE` |

Unique: `@@unique([audit_cycle_id, auditor_user_id])`.

#### 0.2.13 `audit_items`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| audit_cycle_id | Int FK→audit_cycles.id | no | | `ON DELETE CASCADE` |
| asset_id | Int FK→assets.id | no | | `ON DELETE CASCADE` |
| result | enum AuditResult | yes | null | verified \| missing \| damaged (null = not yet checked) |
| notes | String(500) | yes | null | |
| verified_by | Int FK→users.id | yes | null | |
| verified_at | timestamptz | yes | null | |

Unique: `@@unique([audit_cycle_id, asset_id])`. Index: `@@index([audit_cycle_id])`.

#### 0.2.14 `notifications`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| user_id | Int FK→users.id | no | | `ON DELETE CASCADE` |
| type | String(60) | no | | e.g. ASSET_ASSIGNED (see 0.7) |
| message | String(500) | no | | |
| related_entity_type | String(60) | yes | null | e.g. asset, booking |
| related_entity_id | Int | yes | null | |
| is_read | Boolean | no | false | |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([user_id, is_read])`, `@@index([created_at])`.

#### 0.2.15 `activity_logs`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | Int PK | no | autoincrement | |
| user_id | Int FK→users.id | yes | null | `ON DELETE SET NULL` (system actions null) |
| action | String(80) | no | | e.g. CREATE_ASSET |
| entity_type | String(60) | no | | |
| entity_id | Int | yes | null | |
| metadata | Json | yes | null | |
| created_at | timestamptz | no | now() | |

Indexes: `@@index([user_id])`, `@@index([entity_type, entity_id])`, `@@index([created_at])`.

#### 0.2.16 Enums (Prisma)
```
enum Role            { admin asset_manager department_head employee }
enum UserStatus      { active inactive }
enum DeptStatus      { active inactive }
enum FieldType       { text number date boolean }
enum AssetStatus     { Available Allocated Reserved Under_Maintenance Lost Retired Disposed }
enum AllocStatus     { active returned overdue }
enum TransferStatus  { requested approved rejected completed }
enum BookingStatus   { upcoming ongoing completed cancelled }
enum Priority        { low medium high critical }
enum MaintStatus     { pending approved rejected technician_assigned in_progress resolved }
enum AuditStatus     { open closed }
enum AuditResult     { verified missing damaged }
```
> **Note:** Prisma enum values cannot contain spaces. `Under_Maintenance` is the DB enum value; the API/UI display string is **"Under Maintenance"**. Map with a constant `ASSET_STATUS_LABELS` in `backend/src/shared/enums.ts`.

### 0.2.17 Circular FK resolution (EXPLICIT — do this exactly)
`users.department_id → departments.id` and `departments.head_user_id → users.id` reference each other.

**Approach: both FKs are nullable; no bootstrapping migration ordering problem exists because Prisma creates all tables then adds FKs.** Enforce integrity in application logic:
1. Track A migration creates `departments` and `users` in the same migration; both FK columns are nullable.
2. **Seed / runtime order:** create the department row first with `head_user_id = null`, create users referencing `department_id`, then `UPDATE departments SET head_user_id = <user.id>`.
3. Assigning a department head is a two-step app operation (create dept → later PATCH head). Never require both sides populated at insert time.
4. Deleting a user that is a department head sets `head_user_id` to null (`ON DELETE SET NULL`) — the department is not deleted.

### 0.3 Global API Conventions
- **Base URL:** `http://localhost:4000/api/v1`. All routes below are relative to this.
- **Auth header:** `Authorization: Bearer <JWT>`. JWT payload: `{ sub: userId, role, department_id, iat, exp }`, HS256, `JWT_SECRET` from env, `expiresIn=8h`.
- **Content type:** `application/json` for all request/response bodies (file uploads use a URL string field only; no multipart in scope — store an external `file_url`/`photo_url` string).
- **Standard success envelope:** endpoints return the resource directly OR a list envelope (see pagination). No wrapping of single objects.
- **Standard error response shape (ALL non-2xx):**
```json
{ "error": { "code": "STRING_CODE", "message": "Human readable", "details": [ { "field": "email", "issue": "required" } ] } }
```
`details` is optional (present for 422 validation errors). `code` examples: `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `UNPROCESSABLE` (422), `INTERNAL` (500).
- **Standard pagination (all list endpoints):** query params `?page=1&pageSize=20&sort=<field>&order=asc|desc`. Response envelope:
```json
{ "data": [ ...items ], "pagination": { "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 } }
```
Defaults: `page=1`, `pageSize=20` (max 100). Invalid params → clamp, do not 422.
- **Timestamp format:** ISO 8601 UTC with `Z` suffix in all JSON (e.g. `2026-07-12T09:30:00.000Z`). Date-only fields serialize as `YYYY-MM-DD`.
- **HTTP status usage:** 200 (read/update ok), 201 (created), 204 (delete ok, no body), 400 (malformed json), 401, 403, 404, 409 (state conflict e.g. double allocation), 422 (validation/business-rule rejection e.g. overlapping booking), 500.
- **Validation:** every request body validated with a zod schema; failure → 422 `VALIDATION_ERROR` with `details`.

### 0.4 Folder Structure (monorepo, npm workspaces)
```
assetflow-lazy-monks/
├─ package.json                # workspaces: ["backend","frontend"]
├─ README.md
├─ docs/
│  ├─ ER_DIAGRAM.dbml          # committed ER diagram (Track A Phase 0)
│  └─ API_CONTRACT.md          # frozen route list (Track A Phase 0)
├─ backend/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vitest.config.ts
│  ├─ .env.example
│  ├─ prisma/
│  │  ├─ schema.prisma         # single source of truth; track-banner blocks
│  │  ├─ migrations/
│  │  └─ seed.ts               # demo seed (Section 4)
│  └─ src/
│     ├─ index.ts              # express bootstrap
│     ├─ app.ts                # express app factory (used by tests)
│     ├─ prismaClient.ts
│     ├─ shared/
│     │  ├─ enums.ts           # label maps, status constants
│     │  ├─ errors.ts          # AppError + error middleware
│     │  ├─ pagination.ts      # parsePagination(), buildEnvelope()
│     │  ├─ auth.ts            # requireAuth, requireRole middleware (Track A P2)
│     │  ├─ activity.ts        # logActivity() helper (Track D P1)
│     │  └─ notify.ts          # createNotification() helper (Track D P1)
│     └─ modules/
│        ├─ auth/              # Track A  (auth, users, departments, categories)
│        ├─ assets/            # Track B  (assets, allocations, transfers)
│        ├─ operations/        # Track C  (bookings, maintenance)
│        └─ insights/          # Track D  (dashboard, audit, reports, notifications, logs)
│           each module: <name>.routes.ts, <name>.service.ts, <name>.schema.ts, <name>.test.ts, README.md
└─ frontend/
   ├─ package.json
   ├─ vite.config.ts
   ├─ tailwind.config.js
   ├─ index.html
   └─ src/
      ├─ main.tsx
      ├─ App.tsx               # router + role-guarded routes
      ├─ api/client.ts         # axios instance w/ auth interceptor
      ├─ auth/                 # AuthContext, login/signup (Track A)
      ├─ components/           # shared UI (Button, Table, Modal, StatusBadge…)
      └─ pages/
         ├─ auth/    (Track A: Login, Signup)
         ├─ org/     (Track A: OrgSetup 3 tabs)
         ├─ assets/  (Track B: Registry, Allocation)
         ├─ ops/     (Track C: Booking, Maintenance)
         └─ insights/(Track D: Dashboard, Audit, Reports, Logs)
```
**schema.prisma track banners** (prevents merge conflicts): keep models grouped in this order with these exact comment markers:
```
// ===== TRACK A: auth/org =====  (users, departments, asset_categories, category_custom_fields)
// ===== TRACK B: assets =====    (assets, asset_documents, allocations, transfer_requests)
// ===== TRACK C: operations =====(bookings, maintenance_requests)
// ===== TRACK D: insights =====  (audit_cycles, audit_cycle_auditors, audit_items, notifications, activity_logs)
```

### 0.5 Environment / config
`backend/.env.example`:
```
DATABASE_URL="postgresql://assetflow:assetflow@localhost:5432/assetflow?schema=public"
JWT_SECRET="change-me-in-prod"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```
`frontend` uses Vite env: `VITE_API_BASE_URL="http://localhost:4000/api/v1"`.
Provide `docker-compose.yml` at root with a single `postgres:16` service (db name/user/pass matching above) so any track can `docker compose up -d db`.

### 0.6 Asset tag generation (shared rule, implemented by Track B)
- Format: `AF-` + zero-padded 4-digit sequence, starting `AF-0001`.
- Generation MUST be race-safe: inside a DB transaction, `SELECT max(id)`-independent — use a dedicated counter approach: `asset_tag = 'AF-' + String(newAssetId).padStart(4,'0')` computed after insert, OR a `SELECT count`+lock. **Chosen approach:** insert asset with a temporary placeholder inside a transaction, then set `asset_tag = 'AF-' + id.toString().padStart(4,'0')` and update in the same transaction. Beyond 9999, allow 5 digits (`AF-10000`). `qr_code` = the string `asset_tag` (front end renders a QR image from it; backend just stores the tag string).

### 0.7 Notification & Activity taxonomy (shared constants, owned by Track D, referenced by B/C)
Notification `type` string constants (define in `backend/src/shared/enums.ts`, exported as `NOTIF`):
`ASSET_ASSIGNED, TRANSFER_REQUESTED, TRANSFER_APPROVED, TRANSFER_REJECTED, MAINTENANCE_APPROVED, MAINTENANCE_REJECTED, MAINTENANCE_RESOLVED, BOOKING_CONFIRMED, BOOKING_CANCELLED, BOOKING_REMINDER, OVERDUE_RETURN, AUDIT_DISCREPANCY`.
Activity `action` constants (`ACT`): `SIGNUP, LOGIN, PROMOTE_USER, CREATE_DEPARTMENT, UPDATE_DEPARTMENT, CREATE_CATEGORY, CREATE_ASSET, UPDATE_ASSET, ALLOCATE_ASSET, RETURN_ASSET, REQUEST_TRANSFER, APPROVE_TRANSFER, REJECT_TRANSFER, CREATE_BOOKING, CANCEL_BOOKING, RAISE_MAINTENANCE, APPROVE_MAINTENANCE, REJECT_MAINTENANCE, RESOLVE_MAINTENANCE, CREATE_AUDIT_CYCLE, VERIFY_AUDIT_ITEM, CLOSE_AUDIT_CYCLE`.
Producing tracks call `logActivity(...)` and `createNotification(...)` (Track D Phase 1 delivers these helpers; B/C stub-import them — if unavailable at their build time they import from `shared/notify.ts`/`shared/activity.ts` which Track D creates in its Phase 1, a hard dependency noted per phase).

### 0.8 RBAC matrix (authoritative — enforce via `requireRole`)
| Capability | admin | asset_manager | department_head | employee |
|---|---|---|---|---|
| Org setup (dept/category CRUD, promote roles) | ✅ | ❌ | ❌ | ❌ |
| Register/edit assets | ✅ | ✅ | ❌ | ❌ |
| Allocate asset | ✅ | ✅ | ❌ | ❌ |
| Approve transfer (own dept for dept_head) | ✅ | ✅ | ✅(own dept) | ❌ |
| Initiate transfer/return request | ✅ | ✅ | ✅ | ✅(own held) |
| Approve return + condition check-in | ✅ | ✅ | ❌ | ❌ |
| Book resource (dept_head may book for dept) | ✅ | ✅ | ✅ | ✅ |
| Raise maintenance | ✅ | ✅ | ✅ | ✅ |
| Approve/reject maintenance | ✅ | ✅ | ❌ | ❌ |
| Create audit cycle + assign auditors | ✅ | ❌ | ❌ | ❌ |
| Close audit cycle / apply discrepancy resolution | ✅ | ✅ | ❌ | ❌ |
| Verify audit item | ✅ | ✅ | assigned auditor only | assigned auditor only |
| View org-wide reports/dashboard | ✅ | ✅ | dept-scoped | self-scoped |

`requireRole(...roles)` checks the JWT `role`. Dept-scoping (own dept) is enforced additionally in the service layer by comparing `req.user.department_id`.

### 0.9 Git conventions (enforce every phase)
- **Branches:** `feature/<track>-<phase>` where track ∈ {auth, assets, ops, insights}. Persistent per-person branch is fine: `feature/auth-orgsetup`, `feature/assets-allocation`, `feature/booking-maintenance`, `feature/audit-reports`; per-phase sub-branches optional. Integration branch `develop`, release `main`.
- **Commit message pattern:** `feat(<module>): <what>` / `test(<module>): <what>` / `fix(<module>): <what>` / `chore(<module>): <what>`. `<module>` ∈ {auth, org, assets, alloc, transfer, booking, maint, dashboard, audit, reports, notif, logs, infra}. Imperative mood, <= 72 char subject.
- **PR-to-develop step (exact):**
  1. `git checkout <your feature branch> && git pull origin develop --no-rebase` (integrate latest).
  2. Run `npm run verify` in `backend/` (see Section 3 smoke test) — must pass.
  3. `git push origin <branch>`.
  4. Open PR `<branch> → develop`, one-line description = the phase commit subject.
  5. Self-merge (squash) after CI smoke passes. Never merge if `develop`'s smoke would break.
- **Checkpoints:** every 2 hours merge `develop → main` (fast-forward) and tag: `v1` (hr2), `v2` (hr4), `v3` (hr6), `v4` (hr8). Also lightweight hourly tags on develop `hr1..hr8` optional.

---

## 1. Per-Track, Per-Phase Breakdown

> Phases are numbered per track and map ~1:1 to the hour-by-hour plan. Each phase is independently committable and testable. A phase never depends on a *later* phase of any track. Cross-track dependencies on *earlier* phases are stated at the top.

---

### Track A — Phase 0: Repo scaffold, ER diagram, API contract, DB schema + first migration
- **Goal**: Stand up the monorepo, Postgres, Prisma schema for ALL tables, run the first migration, and publish the frozen ER diagram + API contract so B/C/D can build against real tables.
- **Depends on**: none. **Everyone else depends on this phase.**
- **Files to create/modify**:
  - `package.json` (workspaces), `docker-compose.yml`, root `README.md`.
  - `docs/ER_DIAGRAM.dbml`, `docs/API_CONTRACT.md`.
  - `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/.env.example`, `backend/.env`.
  - `backend/prisma/schema.prisma` (ALL models + enums from Section 0.2, with track banners 0.4).
  - `backend/src/index.ts`, `backend/src/app.ts`, `backend/src/prismaClient.ts`.
  - `backend/src/shared/enums.ts`, `backend/src/shared/errors.ts`, `backend/src/shared/pagination.ts`.
  - `frontend/` Vite+React+TS+Tailwind scaffold, `frontend/src/api/client.ts`.
- **DB changes**: Create the **entire** schema in one migration `0000_init` (all 16 tables + enums). Both circular FKs nullable per 0.2.17. Run `npx prisma migrate dev --name init`.
- **API endpoints**: `GET /health` → `200 { "status": "ok", "db": true }` (checks a trivial `SELECT 1` via Prisma). This is the smoke-test target.
- **Business logic detail**: `app.ts` wires: JSON body parser, CORS (`CORS_ORIGIN`), request logger, route mounting placeholder, then the global error middleware from `shared/errors.ts` LAST. `AppError(code, httpStatus, message, details?)` class; error middleware serializes to the 0.3 shape; unknown errors → 500 `INTERNAL`. `parsePagination(query)` returns `{page,pageSize,skip,take,sort,order}` with clamping; `buildEnvelope(data,total,page,pageSize)`.
- **UI components**: App shell only — `App.tsx` with react-router, a placeholder `<Layout>` (sidebar + topbar), Tailwind base styles, and an unauthenticated redirect to `/login`. No screen logic yet.
- **Unit tests to write** (`backend/src/shared/pagination.test.ts`):
  - `test_parsePagination_defaults_when_missing`
  - `test_parsePagination_clamps_pageSize_over_100`
  - `test_parsePagination_negative_page_becomes_1`
  - `test_buildEnvelope_computes_totalPages_ceil`
- **Integration/API tests** (`backend/src/health.test.ts`): `test_health_returns_ok_and_db_true`.
- **Acceptance criteria**:
  - [ ] `docker compose up -d db` then `npm --workspace backend run migrate` applies cleanly on an empty DB.
  - [ ] `GET /api/v1/health` returns `{status:"ok",db:true}`.
  - [ ] `npx prisma studio` shows all 16 tables.
  - [ ] `docs/ER_DIAGRAM.dbml` present and matches Section 0.2.
  - [ ] Frontend `npm --workspace frontend run dev` serves and redirects `/` → `/login`.
- **Commit checkpoint**: `chore(infra): scaffold monorepo, prisma schema, init migration, ER diagram` — satisfies hour-0 commit requirement on its own.

### Track A — Phase 1: Auth (signup/login/JWT/session) + auth middleware
- **Goal**: Employee-only signup, email/password login issuing JWT, session validation, and reusable `requireAuth`/`requireRole` middleware for all tracks.
- **Depends on**: A-Phase 0.
- **Files to create/modify**: `backend/src/modules/auth/auth.routes.ts`, `auth.service.ts`, `auth.schema.ts`, `auth.test.ts`, `backend/src/shared/auth.ts`, `backend/src/modules/auth/README.md`; wire routes in `app.ts`. Frontend: `frontend/src/auth/AuthContext.tsx`, `pages/auth/Login.tsx`, `pages/auth/Signup.tsx`, update `api/client.ts` interceptor.
- **DB changes**: none (uses `users` from Phase 0).
- **API endpoints**:
  - `POST /auth/signup` — auth: public. Body `{ name:string, email:string, password:string(min8), department_id?:int }`. Creates user with **`role='employee'` forced** (ignore any role in body). 201 → `{ id,name,email,role,department_id,status,created_at }` (never return `password_hash`). Errors: 422 validation; 409 `CONFLICT` if email exists.
  - `POST /auth/login` — public. Body `{ email, password }`. 200 → `{ token, user:{id,name,email,role,department_id,status} }`. Errors: 401 `UNAUTHENTICATED` on bad email/password (identical message for both to avoid enumeration); 422 validation; 403 `FORBIDDEN` if `status='inactive'`.
  - `GET /auth/me` — auth: any authenticated. 200 → current user object. 401 if no/invalid token.
- **Business logic detail**: hash with bcrypt cost 10. JWT signed per 0.3. `requireAuth`: read `Authorization` header, verify, attach `req.user={id,role,department_id}`; 401 on missing/expired/invalid. `requireRole(...roles)`: 403 if `req.user.role` not in list. Signup **must not** allow role escalation — even if `role` sent, drop it. Call `logActivity(userId, ACT.SIGNUP,...)` and `ACT.LOGIN` (import from `shared/activity.ts`; if Track D hasn't delivered it yet, provide a temporary no-op `logActivity` in `shared/activity.ts` that Track D later replaces — coordinate; the function signature is frozen here: `logActivity(userId:number|null, action:string, entityType:string, entityId?:number, metadata?:object)`).
- **UI components** (Screen 1): `Login` (props none; states: idle/loading/error; fields email+password; on success store token in `localStorage` + AuthContext, redirect by role to dashboard/home). `Signup` (fields name,email,password,confirm; employee-only note shown). `AuthContext` exposes `{user, token, login(), logout(), isAuthenticated}`. axios interceptor attaches bearer + on 401 clears session → `/login`.
- **Unit tests** (`auth.test.ts` service-level):
  - `test_signup_forces_employee_role_even_if_admin_requested`
  - `test_signup_hashes_password_not_plaintext`
  - `test_signup_duplicate_email_throws_conflict`
  - `test_login_wrong_password_returns_unauthenticated`
  - `test_login_unknown_email_same_error_as_wrong_password`
  - `test_login_inactive_user_forbidden`
  - `test_jwt_payload_contains_sub_role_department`
- **Integration/API tests**:
  - `POST /auth/signup` happy → 201, no password_hash in body.
  - `POST /auth/signup` duplicate → 409.
  - `POST /auth/login` valid → 200 token; `GET /auth/me` with that token → 200 same user.
  - `GET /auth/me` no token → 401; expired token → 401.
- **Acceptance criteria**:
  - [ ] Signup can never create a non-employee.
  - [ ] Login returns a JWT decodable to the 0.3 payload.
  - [ ] `requireAuth`/`requireRole` exported and unit-covered; a protected dummy route returns 401/403 appropriately.
  - [ ] Frontend login persists session across refresh.
- **Commit checkpoint**: `feat(auth): signup, login, jwt, auth+role middleware` — satisfies the hour's commit alone.

### Track A — Phase 2: Department management (Org Setup Tab A)
- **Goal**: Admin CRUD for departments with hierarchy + head assignment (resolving circular FK per 0.2.17).
- **Depends on**: A-Phase 1 (auth middleware).
- **Files**: `backend/src/modules/auth/org.routes.ts`, `org.service.ts`, `org.schema.ts`, `org.test.ts`; frontend `pages/org/OrgSetup.tsx` + `pages/org/DepartmentsTab.tsx`.
- **DB changes**: none (tables from Phase 0).
- **API endpoints** (all `requireRole('admin')` unless noted):
  - `POST /departments` — Body `{ name, parent_department_id?:int, head_user_id?:int, status?:active|inactive }`. 201 dept. 409 if name exists. 422 if `parent_department_id` == self (n/a on create) or references missing dept. 
  - `GET /departments` — auth any; supports pagination + `?status=`. Returns list envelope; each dept includes `head_user` (id,name) and `parent_department` (id,name) expanded.
  - `GET /departments/:id` — auth any. 404 if missing. Includes member count.
  - `PATCH /departments/:id` — admin. Body any subset of {name,parent_department_id,head_user_id,status}. 422 if `parent_department_id` creates a cycle (walk parent chain; reject if `:id` reappears) or equals `:id`. 404 if missing. 409 on name clash.
  - `DELETE /departments/:id` — admin → soft delete (set `status='inactive'`), 200. Do NOT hard delete (users reference it).
- **Business logic detail**: 
  - Head assignment is the second step of circular-FK handling: creating a dept with `head_user_id` set is allowed only if that user exists; otherwise create without head then PATCH.
  - **Cycle prevention algorithm** for `parent_department_id`: starting from proposed parent, follow `parent_department_id` links up to a depth cap (say 50); if the department being edited (`:id`) is encountered, reject 422 `UNPROCESSABLE` "circular hierarchy".
  - Log `ACT.CREATE_DEPARTMENT` / `ACT.UPDATE_DEPARTMENT`.
- **UI components** (Screen 3 Tab A): `DepartmentsTab` — table (name, head, parent, status, actions), create/edit modal, deactivate button. States loading/empty/error. Parent + head are select dropdowns populated from `/departments` and `/users`.
- **Unit tests** (`org.test.ts`):
  - `test_create_department_duplicate_name_conflict`
  - `test_set_parent_to_self_rejected`
  - `test_parent_cycle_detected_and_rejected`
  - `test_assign_head_user_persists`
  - `test_delete_department_soft_deactivates_not_removed`
- **Integration/API tests**: create dept (201) → get list (contains it) → patch head (200 head expanded) → attempt cycle (422) → delete (status inactive).
- **Acceptance criteria**:
  - [ ] Can create dept, assign head after user exists, build 2-level hierarchy.
  - [ ] Cycle attempt rejected with 422.
  - [ ] Non-admin gets 403 on write endpoints.
- **Commit checkpoint**: `feat(org): department CRUD with hierarchy and head assignment`.

### Track A — Phase 3: Asset category management (Tab B) + custom fields
- **Goal**: Admin CRUD categories + optional category-specific custom field definitions.
- **Depends on**: A-Phase 1.
- **Files**: extend `org.routes.ts`/`org.service.ts`/`org.schema.ts`; frontend `pages/org/CategoriesTab.tsx`.
- **DB changes**: none (Phase 0 tables).
- **API endpoints** (admin for writes; reads auth-any):
  - `POST /categories` — Body `{ name }`. 201. 409 duplicate name.
  - `GET /categories` — list (no pagination needed but return list envelope) with nested `custom_fields`.
  - `PATCH /categories/:id` — rename. 404/409.
  - `DELETE /categories/:id` — 409 `CONFLICT` if any asset references it (`ON DELETE RESTRICT`); otherwise 204.
  - `POST /categories/:id/fields` — Body `{ field_name, field_type }`. 201. 409 duplicate field_name in category. 404 category.
  - `DELETE /categories/:id/fields/:fieldId` — 204.
- **Business logic detail**: `field_type` ∈ FieldType enum. Custom field definitions drive the dynamic form in Track B asset registration (Track B reads `GET /categories` to render inputs and stores answers in `assets.custom_fields` JSON keyed by `field_name`). Log `ACT.CREATE_CATEGORY`.
- **UI components** (Screen 3 Tab B): `CategoriesTab` — list categories, add category, expand to manage custom fields (field_name + type dropdown). States loading/empty/error.
- **Unit tests**:
  - `test_create_category_duplicate_conflict`
  - `test_delete_category_with_assets_blocked_409`
  - `test_add_custom_field_duplicate_name_conflict`
  - `test_custom_field_invalid_type_rejected_422`
- **Integration/API tests**: create category → add two custom fields → list shows nested fields → delete field → delete empty category 204.
- **Acceptance criteria**:
  - [ ] Categories CRUD works; deletion protected when in use.
  - [ ] Custom fields attach/detach correctly.
- **Commit checkpoint**: `feat(org): asset category and custom field management`.

### Track A — Phase 4: Employee directory + role promotion (Tab C) — the ONLY place roles are assigned
- **Goal**: Admin views all users, edits department/status, and promotes employees to `department_head`/`asset_manager` (and demotes). This is the sole role-assignment surface.
- **Depends on**: A-Phase 1, A-Phase 2 (departments exist to assign).
- **Files**: extend `org.routes.ts`/`org.service.ts`/`org.schema.ts` (users sub-routes); frontend `pages/org/DirectoryTab.tsx`.
- **API endpoints**:
  - `GET /users` — `requireRole('admin')` for full directory; supports pagination + filters `?role=&department_id=&status=&q=` (q matches name/email). List envelope, never returns password_hash.
  - `PATCH /users/:id/role` — `requireRole('admin')`. Body `{ role: admin|asset_manager|department_head|employee }`. 200 updated user. 404 if missing. **422 if trying to change your own role** (prevent self-lockout ambiguity) — admin cannot demote themselves. Log `ACT.PROMOTE_USER` + notification to the promoted user (`NOTIF`? use activity log; optional notification).
  - `PATCH /users/:id` — admin. Body subset {name, department_id, status}. 200. 404.
- **Business logic detail**: Role changes only via this endpoint (signup can't, no self-service). When a user is promoted to `department_head`, do NOT auto-assign them as a department head record — that's a separate `PATCH /departments/:id {head_user_id}` action (Phase 2). Deactivating a user (`status=inactive`) blocks their login (enforced in Phase 1 login). Log every change.
- **UI components** (Screen 3 Tab C): `DirectoryTab` — searchable/filterable user table (name,email,department,role,status), inline role dropdown (with confirm), status toggle, department reassign. States loading/empty/error.
- **Unit tests**:
  - `test_promote_employee_to_asset_manager`
  - `test_admin_cannot_change_own_role_422`
  - `test_deactivate_user_then_login_forbidden` (integration-linked)
  - `test_non_admin_cannot_list_directory_403`
- **Integration/API tests**: admin lists users → promotes one to department_head (200) → that user's `/auth/me` now shows new role → deactivate user → login 403.
- **Acceptance criteria**:
  - [ ] Roles can ONLY be changed here; verified no other endpoint mutates `users.role`.
  - [ ] Filters + search work; pagination correct.
  - [ ] Self-demotion blocked.
- **Commit checkpoint**: `feat(org): employee directory and role promotion`.

### Track A — Phase 5: RBAC hardening + org-setup polish + integration support
- **Goal**: Audit every track's routes for correct `requireRole`/dept-scoping, finalize the 3-tab Org Setup UI, provide any missing shared helpers.
- **Depends on**: A-Phases 1-4; B/C/D route files present on `develop`.
- **Files**: review/patch across modules; `frontend/src/pages/org/OrgSetup.tsx` (tab container polish, role-guarded route).
- **API endpoints**: none new; may add `GET /users/assignable-heads` convenience (users eligible as dept heads) if useful.
- **Business logic detail**: Confirm the 0.8 RBAC matrix is enforced on EVERY mutating endpoint across all modules. Add missing guards. Ensure dept-scoped reads (department_head sees own dept) applied in assets/allocations/reports where specified.
- **UI components**: Org Setup screen with 3 working tabs, admin-only route guard (non-admin → 403 page/redirect).
- **Unit tests**: `test_rbac_matrix_enforced_matrix` parametrized over (role,endpoint)→expected status for a representative set (≥10 cases).
- **Integration/API tests**: for each role, hit one allowed + one forbidden endpoint; assert 2xx/403.
- **Acceptance criteria**:
  - [ ] No mutating endpoint is reachable by an unauthorized role.
  - [ ] Org Setup 3 tabs fully functional end-to-end.
- **Commit checkpoint**: `feat(auth): enforce RBAC matrix across modules and finalize org setup`.

---

### Track B — Phase 0: Asset model draft + module scaffold
- **Goal**: Confirm asset-related models against the shared schema and scaffold the assets module (routes/service/schema/test files) so work compiles.
- **Depends on**: A-Phase 0 (schema + migration + shared error/pagination helpers).
- **Files**: `backend/src/modules/assets/assets.routes.ts`, `assets.service.ts`, `assets.schema.ts`, `assets.test.ts`, `backend/src/modules/assets/README.md`; mount in `app.ts`.
- **DB changes**: none — `assets`, `asset_documents`, `allocations`, `transfer_requests` already created in `0000_init` under the Track B banner. If any column is missing, add a migration `0001_assets_adjust` (should be unnecessary).
- **API endpoints**: `GET /assets/ping` → `200 {module:"assets"}` (temporary; remove after Phase 1).
- **Business logic detail**: Establish `AssetService` skeleton with typed method stubs (`create`, `list`, `getById`, `update`, `allocate`, `return`, `requestTransfer`, `approveTransfer`) throwing `NotImplemented` until their phase. Define zod schemas file with placeholders.
- **UI components**: none this phase (or a routed empty `pages/assets/Registry.tsx` shell).
- **Unit tests**: `test_assets_module_mounts` (app boots with assets routes).
- **Integration/API tests**: `GET /assets/ping` → 200.
- **Acceptance criteria**: [ ] App boots with assets module mounted; [ ] schema unchanged/valid.
- **Commit checkpoint**: `chore(assets): scaffold assets module against shared schema`.

### Track B — Phase 1: Asset CRUD + auto asset-tag generation + documents
- **Goal**: Register assets (auto `AF-XXXX` tag, QR string, custom fields), read/update, attach document URLs.
- **Depends on**: A-Phase 1 (auth middleware), A-Phase 3 (categories + custom fields for validation).
- **Files**: `assets.routes.ts`, `assets.service.ts`, `assets.schema.ts`, `assets.test.ts`; frontend `pages/assets/Registry.tsx`, `pages/assets/AssetForm.tsx`.
- **DB changes**: none.
- **API endpoints**:
  - `POST /assets` — `requireRole('admin','asset_manager')`. Body `{ name, category_id, serial_number?, acquisition_date?, acquisition_cost?, condition?, location?, is_bookable?:bool, custom_fields?:object, documents?:[{file_url,doc_type?}] }`. 201 → asset with generated `asset_tag`, `qr_code`, `status="Available"`. Errors: 422 validation / unknown category / custom_field not defined for category / wrong custom field type; 409 if `serial_number` provided and already exists (treat serial as unique-when-present, enforced in app logic).
  - `GET /assets/:id` — auth any. 200 asset incl. category, documents, current allocation (if any). 404.
  - `PATCH /assets/:id` — `requireRole('admin','asset_manager')`. Editable: name, serial_number, acquisition_date, acquisition_cost, condition, location, is_bookable, custom_fields, category_id, documents. **Cannot** set `status` directly here (status transitions go through allocation/maintenance/audit flows or the dedicated transition endpoint in Phase 2). 404/422/409.
  - `POST /assets/:id/documents` — asset_manager/admin. Body `{ file_url, doc_type? }`. 201.
- **Business logic detail**:
  - **Tag generation** per 0.6: within a Prisma `$transaction`, create the asset, then update `asset_tag='AF-'+id.padStart(4,'0')`, `qr_code=asset_tag`. Guarantees uniqueness via PK.
  - **Custom field validation**: fetch category's `category_custom_fields`; every key in `custom_fields` must match a defined `field_name`; value must satisfy `field_type` (number→numeric, date→ISO date, boolean→bool, text→string). Unknown keys → 422.
  - New assets ALWAYS start `Available`.
  - Log `ACT.CREATE_ASSET` / `ACT.UPDATE_ASSET`.
- **UI components** (Screen 4 register part): `AssetForm` — dynamic form; category select drives rendering of custom fields; document URL list; bookable toggle. States loading/submitting/error/success. `Registry` shows created asset with its tag + QR (render QR from `qr_code` using a QR lib on the client).
- **Unit tests**:
  - `test_first_asset_gets_tag_AF_0001`
  - `test_tags_are_sequential_and_unique`
  - `test_new_asset_status_is_available`
  - `test_reject_unknown_category_422`
  - `test_custom_field_wrong_type_rejected_422`
  - `test_custom_field_unknown_key_rejected_422`
  - `test_duplicate_serial_number_conflict_409`
  - `test_patch_cannot_set_status_directly`
- **Integration/API tests**: create asset (201, tag AF-0001) → create second (AF-0002) → get by id (200) → patch location (200) → add document (201) → non-manager create → 403.
- **Acceptance criteria**:
  - [ ] Sequential unique tags; QR string = tag.
  - [ ] Custom fields validated against category definitions.
  - [ ] Status not settable via CRUD.
- **Commit checkpoint**: `feat(assets): asset CRUD, auto tag generation, documents`.

### Track B — Phase 2: Asset search/filter, lifecycle status transitions, per-asset history
- **Goal**: Powerful directory search/filter; controlled asset status state-machine endpoint; per-asset allocation + maintenance history read.
- **Depends on**: B-Phase 1.
- **Files**: extend `assets.routes.ts`/`assets.service.ts`/`assets.schema.ts`; frontend `pages/assets/Registry.tsx` (filters), `pages/assets/AssetDetail.tsx`.
- **API endpoints**:
  - `GET /assets` — auth any (department_head/employee see all assets read-only; writes still guarded). Pagination + filters: `?q=` (matches asset_tag, serial_number, name), `?category_id=`, `?status=`, `?location=`, `?department_id=` (via current allocation), `?is_bookable=`. `q` on `asset_tag` also accepts scanning a QR value (equals asset_tag). List envelope.
  - `PATCH /assets/:id/status` — `requireRole('admin','asset_manager')`. Body `{ status, reason? }`. Enforces the transition table below. 200 updated / 422 `UNPROCESSABLE` on illegal transition.
  - `GET /assets/:id/history` — auth any. 200 → `{ allocations:[...], maintenance:[...] }` ordered desc by date.
- **Business logic detail** — **Asset status state machine (authoritative).** Allowed `from → to`:

  | From | Allowed To |
  |---|---|
  | Available | Allocated, Reserved, Under_Maintenance, Lost, Retired, Disposed |
  | Allocated | Available (on return), Under_Maintenance (via approved maint), Lost |
  | Reserved | Available, Allocated, Cancelled→Available |
  | Under_Maintenance | Available (on resolve), Lost, Retired |
  | Lost | Available (found), Retired, Disposed |
  | Retired | Disposed |
  | Disposed | (terminal — no transitions) |

  Any transition not listed → 422. **Note:** some transitions are performed by other tracks' flows (allocation flips Available↔Allocated, maintenance flips Available↔Under_Maintenance, audit sets missing→Lost). Those flows call the SAME `assetService.transitionStatus()` method so the machine is enforced centrally. Manual `PATCH /assets/:id/status` is for admin corrections (e.g. mark Lost/Retired/Disposed). Log `ACT.UPDATE_ASSET` with metadata `{from,to,reason}`.
- **UI components** (Screen 4 directory + detail): `Registry` filter bar (search box + dropdowns) + results table with `StatusBadge`. `AssetDetail` shows fields, custom fields, QR, and two history timelines (allocations, maintenance) with empty/loading/error states.
- **Unit tests**:
  - `test_transition_available_to_allocated_ok`
  - `test_transition_disposed_to_anything_rejected`
  - `test_transition_retired_to_available_rejected`
  - `test_illegal_transition_returns_422`
  - `test_search_by_asset_tag_exact`
  - `test_filter_by_status_and_category_combined`
  - `test_history_returns_allocations_and_maintenance`
- **Integration/API tests**: seed assets → filter by status (envelope counts correct) → transition Available→Retired (200) → Retired→Available (422) → history endpoint returns arrays.
- **Acceptance criteria**:
  - [ ] Every illegal transition rejected with 422; central `transitionStatus()` used by all callers.
  - [ ] Search/filter combinations return correct paginated results.
  - [ ] Per-asset history populated.
- **Commit checkpoint**: `feat(assets): search/filter, status state machine, per-asset history`.

### Track B — Phase 3: Allocation + double-allocation conflict blocking + return flow
- **Goal**: Allocate assets to employee/department with hard block on double-allocation, and a return flow that reverts status to Available with condition check-in.
- **Depends on**: B-Phase 2 (status machine), A-Phase 4 (users/roles), A-Phase 2 (departments).
- **Files**: `backend/src/modules/assets/alloc.routes.ts`, `alloc.service.ts`, `alloc.schema.ts`, `alloc.test.ts`; frontend `pages/assets/Allocation.tsx`.
- **API endpoints**:
  - `POST /allocations` — `requireRole('admin','asset_manager')` only (Department Head **approves transfers**, does not allocate — matches product roles). Body `{ asset_id, employee_id?:int, department_id?:int, expected_return_date?:date, condition_notes_out? }`. Exactly one of employee_id/department_id required (422 if both null or both set). 201 allocation; side effect: asset status Available→Allocated. Errors: **409 `CONFLICT`** if asset already has an `active` allocation — response body includes `{ error:{ code:"CONFLICT", message:"Asset currently held by <holderName>", details:[{field:"asset_id", issue:"already_allocated", holder_user_id, holder_name}] } }` so the UI can show the Transfer button; 422 if asset status not Available (e.g. Under_Maintenance/Retired); 404 asset/user/dept.
  - `POST /allocations/:id/return` — `requireRole('admin','asset_manager')` (approves return + condition check-in). Body `{ condition_notes_in?, actual_return_date? }`. 200; sets allocation `status='returned'`, `actual_return_date`, asset status Allocated→Available. 422 if allocation already returned. 404.
  - `GET /allocations` — auth any (dept/self scoped): admin/asset_manager all; department_head own dept; employee own allocations only. Filters `?status=&asset_id=&employee_id=&department_id=`. Pagination.
- **Business logic detail**:
  - **Double-allocation check (authoritative):** in a transaction, `SELECT ... FROM allocations WHERE asset_id=? AND status='active' FOR UPDATE`; if a row exists → 409. Otherwise create allocation + transition asset to Allocated. This enforces the "at most one active allocation per asset" rule from 0.2.7.
  - Allocation requires asset currently `Available` (else 422). Reserved is set by bookings, not allocation.
  - On return, revert to Available via `transitionStatus()`.
  - Notifications: on allocate → `createNotification(employee_id, NOTIF.ASSET_ASSIGNED, ...)`. Log `ACT.ALLOCATE_ASSET` / `ACT.RETURN_ASSET`.
- **UI components** (Screen 5 allocation): `Allocation` — asset picker (only Available), employee/department target, expected return date, condition-out notes. If backend returns 409, show "currently held by X" banner + **Request Transfer** button (wired in Phase 4). Return sub-view lists active allocations with a Return action capturing condition-in notes. States loading/empty/error/conflict.
- **Unit tests**:
  - `test_allocate_available_asset_succeeds_and_status_allocated`
  - `test_block_double_allocation_returns_409`
  - `test_409_body_includes_current_holder_name`
  - `test_allocate_requires_exactly_one_target_422`
  - `test_allocate_non_available_asset_422`
  - `test_return_reverts_status_to_available`
  - `test_return_already_returned_422`
  - `test_department_head_cannot_allocate_other_dept_403`
- **Integration/API tests**: allocate asset to Priya (201, asset Allocated) → allocate same to Raj (409 with holder=Priya) → return (200, asset Available) → re-allocate to Raj (201). Employee listing shows only own allocations.
- **Acceptance criteria**:
  - [ ] Double allocation impossible; 409 carries holder info matching the PDF example (Priya/Raj/Laptop).
  - [ ] Return reverts status and records condition-in.
  - [ ] Dept-scoping enforced.
- **Commit checkpoint**: `feat(alloc): allocation with double-allocation block and return flow`.

### Track B — Phase 4: Transfer request workflow
- **Goal**: Requested → Approved/Rejected → Completed transfer workflow that re-allocates and updates history automatically.
- **Depends on**: B-Phase 3 (allocations).
- **Files**: `backend/src/modules/assets/transfer.routes.ts`, `transfer.service.ts`, `transfer.schema.ts`, `transfer.test.ts`; frontend `pages/assets/Allocation.tsx` (transfer section).
- **API endpoints**:
  - `POST /transfer-requests` — auth any authenticated (typically the would-be new holder or a manager). Body `{ asset_id, to_user_id }`. Derives `from_user_id` = current active allocation holder (may be null if dept-held), `requested_by`=caller. 201 status `requested`. 422 if asset has no active allocation (nothing to transfer) OR `to_user_id` already the holder. 404 asset/user.
  - `POST /transfer-requests/:id/approve` — `requireRole('admin','asset_manager','department_head')` (dept_head own dept). Atomic: mark request `completed`, close current active allocation (`status='returned'`, actual_return_date=now), create new active allocation for `to_user_id`, asset stays Allocated. Set `approved_by`. 200. 422 if not in `requested` state. 409 if a competing transfer already completed for this asset since request. 
  - `POST /transfer-requests/:id/reject` — same roles. Body `{ reason? }`. Sets `rejected`. 200. 422 if not `requested`.
  - `GET /transfer-requests` — auth (scoped): filters `?status=&asset_id=`. Pagination.
- **Business logic detail**:
  - **State machine:** `requested → approved`(optional intermediate, we collapse) `/ rejected`; on approve go straight to `completed` after re-allocation. Allowed transitions: `requested→completed`, `requested→rejected`. Any other → 422.
  - Approval is transactional: reuse the double-allocation logic — the old allocation is closed in the SAME transaction the new one opens, so the single-active-allocation invariant holds.
  - Notifications: on request → notify current holder + approvers (`NOTIF.TRANSFER_REQUESTED`); on approve → notify to_user + from_user (`NOTIF.TRANSFER_APPROVED`, plus `ASSET_ASSIGNED` to new holder); on reject → `NOTIF.TRANSFER_REJECTED` to requester. Log `ACT.REQUEST_TRANSFER/APPROVE_TRANSFER/REJECT_TRANSFER`.
- **UI components** (Screen 5 transfer): transfer request list (incoming to approve for managers; outgoing for requesters) with approve/reject actions; the "Request Transfer" button from Phase 3's 409 flow opens a modal prefilled with asset + suggested to_user (caller). States loading/empty/error.
- **Unit tests**:
  - `test_request_transfer_on_unallocated_asset_422`
  - `test_approve_transfer_reallocates_and_closes_old`
  - `test_approve_keeps_single_active_allocation_invariant`
  - `test_reject_transfer_leaves_allocation_unchanged`
  - `test_approve_non_requested_state_422`
  - `test_transfer_history_updated_automatically`
- **Integration/API tests**: allocate to Priya → Raj requests transfer (201) → manager approves (200) → asset now allocated to Raj, Priya's allocation returned, exactly one active allocation → GET history shows both records.
- **Acceptance criteria**:
  - [ ] Approval atomically re-allocates; invariant of one active allocation preserved.
  - [ ] Reject changes nothing but status.
  - [ ] History reflects transfer automatically.
- **Commit checkpoint**: `feat(transfer): transfer request workflow with atomic re-allocation`.

### Track B — Phase 5: Overdue return auto-flagging
- **Goal**: Detect and flag allocations past `expected_return_date`, set `status='overdue'`, and emit overdue notifications feeding Dashboard + Notifications.
- **Depends on**: B-Phase 3.
- **Files**: `backend/src/modules/assets/overdue.service.ts`, extend `alloc.routes.ts`; frontend surfaces overdue in `Allocation.tsx` (badge).
- **API endpoints**:
  - `POST /allocations/flag-overdue` — `requireRole('admin','asset_manager')` (also invoked internally/by a lightweight interval). Scans active allocations where `expected_return_date < today`, sets `status='overdue'`, emits `NOTIF.OVERDUE_RETURN` to holder (once). 200 → `{ flagged: <count> }`.
  - `GET /allocations?status=overdue` — reuse Phase 3 list.
- **Business logic detail**:
  - **Overdue rule:** an allocation is overdue when `status IN ('active')` AND `expected_return_date` is non-null AND `expected_return_date < CURRENT_DATE` (date comparison, not time). Idempotent: only flip `active→overdue` and only notify if not already overdue (track via status). Returning an overdue allocation still allowed (overdue→returned).
  - Run this scan on server boot and every N minutes via `setInterval` (N=5 min; guard against overlap). Also expose the manual endpoint above for demos/tests. **No later-phase dependency** — self-contained.
  - Update state machine: allocation `active→overdue`, `overdue→returned` allowed; `overdue→active` not allowed.
- **UI components**: overdue allocations shown with red badge in allocation list and counted on Dashboard (Track D reads `status='overdue'`).
- **Unit tests**:
  - `test_allocation_past_expected_return_flagged_overdue`
  - `test_allocation_due_today_not_yet_overdue` (boundary: `expected_return_date == today` is NOT overdue)
  - `test_no_expected_return_date_never_overdue`
  - `test_flag_overdue_is_idempotent_no_duplicate_notifications`
  - `test_overdue_allocation_can_still_be_returned`
- **Integration/API tests**: create allocation with past expected_return_date → run flag-overdue (flagged=1) → list status=overdue returns it → run again (flagged=0, no dup notification).
- **Acceptance criteria**:
  - [ ] Boundary (`due today`) not flagged; strictly past dates flagged.
  - [ ] Idempotent; one notification per overdue event.
- **Commit checkpoint**: `feat(alloc): overdue return auto-flagging with notifications`.

---

### Track C — Phase 0: Booking & maintenance model draft + module scaffold
- **Goal**: Confirm `bookings` + `maintenance_requests` models and scaffold the operations module.
- **Depends on**: A-Phase 0.
- **Files**: `backend/src/modules/operations/booking.routes.ts`, `booking.service.ts`, `booking.schema.ts`, `booking.test.ts`, `maint.routes.ts`, `maint.service.ts`, `maint.schema.ts`, `maint.test.ts`, `backend/src/modules/operations/README.md`; mount in `app.ts`.
- **DB changes**: none — tables created in `0000_init` under Track C banner.
- **API endpoints**: `GET /operations/ping` → `200 {module:"operations"}` (temporary).
- **Business logic detail**: Service skeletons with typed stubs. Import `assetService.transitionStatus` type contract from Track B shared export (for maintenance status flips) — if Track B not merged yet, code against the frozen signature `transitionStatus(assetId:number, to:AssetStatus, actorId:number, reason?:string): Promise<Asset>` and integrate once available.
- **Unit tests**: `test_operations_module_mounts`.
- **Integration/API tests**: `GET /operations/ping` → 200.
- **Acceptance criteria**: [ ] App boots with operations module mounted.
- **Commit checkpoint**: `chore(ops): scaffold operations module against shared schema`.

### Track C — Phase 1: Booking overlap validation logic + create booking
- **Goal**: Create bookings for bookable assets with strict overlap rejection.
- **Depends on**: A-Phase 1 (auth), B-Phase 1 (assets exist + `is_bookable`). If B-Phase 1 not merged, seed a bookable asset row directly for tests.
- **Files**: `booking.routes.ts`, `booking.service.ts`, `booking.schema.ts`, `booking.test.ts`; frontend `pages/ops/Booking.tsx` (create form).
- **API endpoints**:
  - `POST /bookings` — `requireRole('admin','asset_manager','department_head','employee')` (any authenticated). Body `{ resource_asset_id, start_time, end_time, department_id? }`. 201 booking `status='upcoming'`. Errors: 422 if `end_time <= start_time`; 422 if asset `is_bookable=false`; 404 asset; **422 `UNPROCESSABLE`** (code `OVERLAP`) if it overlaps an existing non-cancelled booking for that asset — response `details:[{field:"time", issue:"overlap", conflicting_booking_id}]`.
  - `GET /bookings` — auth any. Filters `?resource_asset_id=&status=&from=&to=&booked_by_user_id=`. Pagination. Used by calendar (Phase 3).
- **Business logic detail** — **Overlap detection (authoritative algorithm):** a new booking `[newStart, newEnd)` conflicts with an existing booking `[exStart, exEnd)` (status ∈ upcoming/ongoing) iff `newStart < exEnd AND newEnd > exStart`. **Adjacent bookings are allowed:** a booking `10:00–11:00` does NOT conflict with `09:00–10:00` (touching endpoints, half-open intervals). Cancelled/completed bookings are ignored in the check. Query: `SELECT 1 FROM bookings WHERE resource_asset_id=? AND status IN ('upcoming','ongoing') AND start_time < :newEnd AND end_time > :newStart`. Do the check + insert inside a transaction with row locking on that asset's bookings to avoid race double-book. **Reserved status:** if the bookable asset is currently `Available`, call `transitionStatus(..., 'Reserved')` when the first upcoming/ongoing booking is created; when the last upcoming/ongoing booking ends or is cancelled, transition `Reserved→Available`. Never overwrite `Allocated` / `Under_Maintenance` / terminal statuses. Notifications: on create → `NOTIF.BOOKING_CONFIRMED`. Log `ACT.CREATE_BOOKING`.
- **UI components** (Screen 6 create): `Booking` create form — resource select (bookable only), start/end datetime pickers, on 422 OVERLAP show conflicting slot message. States loading/error/overlap.
- **Unit tests**:
  - `test_reject_overlapping_booking_same_start`
  - `test_reject_partial_overlap_9_30_when_9_to_10_exists`
  - `test_allow_booking_starting_at_existing_end_time` (10:00–11:00 after 9:00–10:00)
  - `test_allow_booking_ending_at_existing_start_time`
  - `test_reject_end_before_start_422`
  - `test_reject_booking_non_bookable_asset_422`
  - `test_cancelled_booking_does_not_block_overlap`
- **Integration/API tests**: book Room B2 9:00–10:00 (201) → book 9:30–10:30 (422 OVERLAP) → book 10:00–11:00 (201) → cancel first → re-book 9:30–10:30 now (201).
- **Acceptance criteria**:
  - [ ] Half-open interval semantics: touching endpoints allowed, true overlaps rejected (matches PDF Room B2 example exactly).
  - [ ] Non-bookable assets can't be booked.
- **Commit checkpoint**: `feat(booking): create booking with overlap validation`.

### Track C — Phase 2: Maintenance workflow state machine + raise request
- **Goal**: Raise maintenance requests and drive the full approval workflow state machine (without asset-status side effects yet — that's Phase 4).
- **Depends on**: A-Phase 1, B-Phase 1 (assets).
- **Files**: `maint.routes.ts`, `maint.service.ts`, `maint.schema.ts`, `maint.test.ts`; frontend `pages/ops/Maintenance.tsx`.
- **API endpoints**:
  - `POST /maintenance-requests` — any authenticated. Body `{ asset_id, issue_description, priority?, photo_url? }`. 201 `status='pending'`, `raised_by`=caller. 404 asset. 422 validation.
  - `POST /maintenance-requests/:id/approve` — `requireRole('admin','asset_manager')`. 200 → `status='approved'`, `approved_by`=caller. 422 if not `pending`.
  - `POST /maintenance-requests/:id/reject` — `requireRole('admin','asset_manager')`. Body `{ reason? }`. 200 → `rejected`. 422 if not `pending`.
  - `POST /maintenance-requests/:id/assign` — asset_manager/admin. Body `{ technician_name }`. 200 → `technician_assigned`. 422 if not `approved`.
  - `POST /maintenance-requests/:id/start` — asset_manager/admin. 200 → `in_progress`. 422 if not `technician_assigned`.
  - `POST /maintenance-requests/:id/resolve` — asset_manager/admin. 200 → `resolved`, `resolved_at`=now. 422 if not `in_progress`.
  - `GET /maintenance-requests` — auth (scoped: employee sees own raised; managers all). Filters `?status=&asset_id=&priority=`. Pagination.
- **Business logic detail** — **Maintenance state machine (authoritative).** Allowed `from → to`:

  | From | Allowed To |
  |---|---|
  | pending | approved, rejected |
  | approved | technician_assigned |
  | technician_assigned | in_progress |
  | in_progress | resolved |
  | rejected | (terminal) |
  | resolved | (terminal) |

  Any other transition → 422 `UNPROCESSABLE`. Notifications: approve → `NOTIF.MAINTENANCE_APPROVED` to raiser; reject → `NOTIF.MAINTENANCE_REJECTED`; resolve → `NOTIF.MAINTENANCE_RESOLVED`. Log `ACT.RAISE_MAINTENANCE/APPROVE_MAINTENANCE/REJECT_MAINTENANCE/RESOLVE_MAINTENANCE`. **Asset status flips are intentionally deferred to Phase 4** so this phase compiles/tests without Track B's `transitionStatus` merged.
- **UI components** (Screen 7): `Maintenance` — raise form (asset, issue, priority, photo URL), request list with workflow action buttons contextual to current state, priority + status badges. States loading/empty/error.
- **Unit tests**:
  - `test_raise_creates_pending_request`
  - `test_pending_to_approved_ok`
  - `test_pending_to_in_progress_rejected_422` (must go through approved+assigned)
  - `test_approve_non_pending_422`
  - `test_reject_is_terminal_cannot_reopen`
  - `test_resolve_sets_resolved_at`
  - `test_full_happy_path_pending_to_resolved`
- **Integration/API tests**: raise (201 pending) → approve (200) → assign tech (200) → start (200) → resolve (200 resolved_at set); reject path from pending; illegal jump returns 422.
- **Acceptance criteria**:
  - [ ] Every workflow edge enforced; skipping states rejected with 422.
  - [ ] Terminal states cannot transition.
- **Commit checkpoint**: `feat(maint): maintenance workflow state machine`.

### Track C — Phase 3: Booking calendar UI + booking status lifecycle
- **Goal**: Calendar view of a resource's bookings and automatic booking status lifecycle (upcoming→ongoing→completed by time).
- **Depends on**: C-Phase 1.
- **Files**: extend `booking.routes.ts`/`booking.service.ts`; frontend `pages/ops/Booking.tsx` (calendar), `components/BookingCalendar.tsx`.
- **API endpoints**:
  - `GET /bookings/calendar?resource_asset_id=&from=&to=` — auth any. 200 → array of bookings in range for that resource, ordered by start_time (no pagination; range-bounded). Used to render the calendar.
  - `POST /bookings/refresh-status` — asset_manager/admin (also internal interval). Transitions: `upcoming→ongoing` when `start_time<=now<end_time`; `ongoing→completed` when `end_time<=now`. 200 `{ updated:<count> }`.
- **Business logic detail** — **Booking status rule:** derived from time vs now. `upcoming`: now<start; `ongoing`: start<=now<end; `completed`: now>=end; `cancelled`: set explicitly (Phase 4), never auto-changed. Run refresh on boot + every 1 min via interval. Idempotent. `cancelled` bookings are skipped.
- **UI components** (Screen 6 calendar): `BookingCalendar` props `{ resourceAssetId, bookings }` — day/week grid showing booked slots with status color; empty/loading/error states; clicking empty slot opens create modal (Phase 1 endpoint).
- **Unit tests**:
  - `test_upcoming_becomes_ongoing_at_start`
  - `test_ongoing_becomes_completed_after_end`
  - `test_cancelled_not_auto_transitioned`
  - `test_refresh_status_idempotent`
  - `test_calendar_returns_only_range_and_resource`
- **Integration/API tests**: create booking in past window → refresh-status → becomes completed; create current window → becomes ongoing; calendar endpoint returns only that resource in range.
- **Acceptance criteria**:
  - [ ] Time-based lifecycle correct at boundaries.
  - [ ] Calendar renders a resource's slots visually.
- **Commit checkpoint**: `feat(booking): calendar view and time-based status lifecycle`.

### Track C — Phase 4: Maintenance → asset status auto-update on approve/resolve
- **Goal**: Wire the maintenance workflow into Track B's asset status machine: approve flips asset to Under_Maintenance, resolve flips back to Available.
- **Depends on**: C-Phase 2, **B-Phase 2 (asset `transitionStatus` must be merged to develop).**
- **Files**: modify `maint.service.ts` to call `assetService.transitionStatus`.
- **API endpoints**: no new routes; augments `approve` and `resolve` behavior from C-Phase 2.
- **Business logic detail**:
  - On `approve`: within the same transaction, call `transitionStatus(asset_id, 'Under_Maintenance', actorId, 'maintenance approved')`. If the asset is currently `Allocated`, the machine allows Allocated→Under_Maintenance; if `Available`, Available→Under_Maintenance. If asset in a state that can't go to Under_Maintenance (e.g. Retired/Disposed) → 422 and the approval is rolled back.
  - On `resolve`: transition asset Under_Maintenance→Available (`'maintenance resolved'`). If the asset had been Allocated before maintenance, business decision: **revert to Available** (allocation, if still active, should have been handled separately; for hackathon scope, resolve always sets Available). Document this assumption in module README.
  - These calls must be transactional with the status change so a failed transition rolls back the maintenance state change.
- **UI components**: reflect asset status change on the maintenance detail (show linked asset status badge updating).
- **Unit tests**:
  - `test_approve_sets_asset_under_maintenance`
  - `test_resolve_sets_asset_available`
  - `test_approve_on_disposed_asset_rolls_back_422`
  - `test_status_change_transactional_with_maint_state`
- **Integration/API tests**: register asset (Available) → raise+approve maintenance → GET asset shows Under_Maintenance → assign→start→resolve → asset Available again.
- **Acceptance criteria**:
  - [ ] Approve/resolve reliably flip asset status via the central machine.
  - [ ] Rollback on illegal transition (no half-applied state).
- **Commit checkpoint**: `feat(maint): auto-update asset status on approve and resolve`.

### Track C — Phase 5: Booking cancel/reschedule + reminders
- **Goal**: Cancel and reschedule bookings (re-validating overlap) and emit reminder notifications before a slot starts.
- **Depends on**: C-Phase 1, C-Phase 3.
- **Files**: extend `booking.routes.ts`/`booking.service.ts`; frontend `Booking.tsx` (cancel/reschedule actions).
- **API endpoints**:
  - `POST /bookings/:id/cancel` — owner or manager. 200 → `status='cancelled'`. 422 if already completed/cancelled. Notification `NOTIF.BOOKING_CANCELLED`.
  - `PATCH /bookings/:id/reschedule` — owner or manager. Body `{ start_time, end_time }`. Re-runs overlap validation (excluding this booking itself). 200 updated. 422 on overlap/invalid range/if booking not `upcoming`.
  - `POST /bookings/emit-reminders` — asset_manager/admin (also internal interval). Finds `upcoming` bookings starting within the next 15 minutes not yet reminded, emits `NOTIF.BOOKING_REMINDER` to `booked_by_user_id`. 200 `{ reminded:<count> }`.
- **Business logic detail**:
  - Reschedule overlap check must EXCLUDE the booking's own id: `... AND id <> :bookingId`.
  - Only `upcoming` bookings can be rescheduled; ongoing/completed cannot.
  - Reminder idempotency: track reminded state (add a boolean `reminder_sent` — **schema addition:** add `reminder_sent Boolean @default(false)` to `bookings`; migration `0002_booking_reminder_flag` under Track C banner). Only send once.
- **UI components** (Screen 6): cancel + reschedule buttons on upcoming bookings; reschedule modal reuses create form validation.
- **Unit tests**:
  - `test_cancel_upcoming_booking_ok`
  - `test_cancel_completed_booking_422`
  - `test_reschedule_excludes_self_from_overlap`
  - `test_reschedule_into_conflict_422`
  - `test_reschedule_non_upcoming_422`
  - `test_reminder_sent_once_only`
- **Integration/API tests**: create two adjacent bookings → reschedule one into overlap (422) → reschedule to free slot (200) → cancel (200) → emit-reminders on soon-starting booking (reminded=1, second call 0).
- **Acceptance criteria**:
  - [ ] Reschedule re-validates overlap excluding self.
  - [ ] Reminders fire once per booking.
- **Commit checkpoint**: `feat(booking): cancel, reschedule with overlap recheck, and reminders`.

---

### Track D — Phase 0: Insights module scaffold + audit/notification model draft
- **Goal**: Scaffold the insights module and confirm `audit_cycles`, `audit_cycle_auditors`, `audit_items`, `notifications`, `activity_logs` models.
- **Depends on**: A-Phase 0.
- **Files**: `backend/src/modules/insights/dashboard.routes.ts`, `audit.routes.ts`, `reports.routes.ts`, `notif.routes.ts`, `logs.routes.ts` + matching `.service.ts`/`.schema.ts`/`.test.ts`, `backend/src/modules/insights/README.md`; mount in `app.ts`.
- **DB changes**: none (tables in `0000_init`, Track D banner).
- **API endpoints**: `GET /insights/ping` → `200 {module:"insights"}`.
- **Business logic detail**: service skeletons; define the shared notification/activity taxonomy constants file expectations (Phase 1 delivers real helpers).
- **Unit tests**: `test_insights_module_mounts`.
- **Integration/API tests**: `GET /insights/ping` → 200.
- **Acceptance criteria**: [ ] App boots with insights module mounted.
- **Commit checkpoint**: `chore(insights): scaffold insights module against shared schema`.

### Track D — Phase 1: Notification + activity-log helpers and read endpoints (SHARED INFRA — deliver early)
- **Goal**: Implement `createNotification()` and `logActivity()` shared helpers (consumed by Tracks A/B/C) plus notification/log read + mark-read endpoints. **This is a hard dependency for A-P1, B-P3/4/5, C-P1/2/4/5 notifications/logging — deliver and merge to develop by hour 2.**
- **Depends on**: A-Phase 0. (Should merge before other tracks need notifications; until then those tracks use the frozen no-op signatures.)
- **Files**: `backend/src/shared/notify.ts`, `backend/src/shared/activity.ts`, `backend/src/modules/insights/notif.routes.ts`+`service`, `logs.routes.ts`+`service`, tests; frontend `pages/insights/Notifications.tsx`, `pages/insights/ActivityLogs.tsx`, `components/NotificationBell.tsx`.
- **API endpoints**:
  - `GET /notifications` — auth: current user only. Filters `?is_read=`. Pagination, newest first. Returns only `req.user.id`'s notifications.
  - `PATCH /notifications/:id/read` — owner only. 200. 404 if not owner's.
  - `POST /notifications/mark-all-read` — owner. 200 `{ updated:<count> }`.
  - `GET /notifications/unread-count` — owner. 200 `{ count }`.
  - `GET /activity-logs` — `requireRole('admin','asset_manager')` (managers see all; department_head dept-scoped by acting user's dept; employee sees own actions). Filters `?entity_type=&entity_id=&user_id=&action=&from=&to=`. Pagination, newest first.
- **Business logic detail**:
  - `createNotification(userId, type, message, relatedEntityType?, relatedEntityId?)` inserts a row; never throws to caller on failure (log + swallow so business flows aren't broken by notification errors).
  - `logActivity(userId|null, action, entityType, entityId?, metadata?)` inserts a row; also non-throwing. Signature FROZEN per 0.7.
  - Both are the canonical implementations replacing any temporary no-ops other tracks created.
- **UI components** (Screen 10): `NotificationBell` (unread count badge, dropdown list, mark read); `Notifications` page (full list, filter read/unread); `ActivityLogs` page (table: who/action/entity/when, filters). States loading/empty/error.
- **Unit tests**:
  - `test_create_notification_persists_for_user`
  - `test_notification_helper_swallows_errors`
  - `test_log_activity_persists_with_metadata_json`
  - `test_user_only_sees_own_notifications`
  - `test_mark_read_other_users_notification_404`
- **Integration/API tests**: create notifications for two users → each `GET /notifications` sees only theirs → mark one read → unread-count decrements → activity-logs manager view returns entries.
- **Acceptance criteria**:
  - [ ] Helpers importable and used by A/B/C; non-throwing.
  - [ ] Notification privacy enforced (own only).
  - [ ] Logs queryable by entity/user/action.
- **Commit checkpoint**: `feat(notif): notification and activity-log helpers with read endpoints`.

### Track D — Phase 2: Dashboard KPI endpoint (stub → real)
- **Goal**: Single dashboard endpoint returning all KPI cards; start with computed-from-real-tables where available, gracefully zero where a source table is empty.
- **Depends on**: A-Phase 0. Consumes B (assets/allocations) and C (bookings/maintenance) tables when populated — reads tables directly, so no code dependency, only data.
- **Files**: `dashboard.routes.ts`, `dashboard.service.ts`, `dashboard.test.ts`; frontend `pages/insights/Dashboard.tsx`, `components/KpiCard.tsx`.
- **API endpoints**:
  - `GET /dashboard/kpis` — auth any (scope: admin/asset_manager org-wide; department_head own dept; employee self). 200 →
    ```json
    { "assets_available": 0, "assets_allocated": 0, "maintenance_today": 0,
      "active_bookings": 0, "pending_transfers": 0, "upcoming_returns": 0,
      "overdue_returns": 0 }
    ```
  - `GET /dashboard/overdue` — auth (scoped). 200 → list of overdue allocations (asset, holder, expected_return_date, days_overdue). Separate from upcoming.
  - `GET /dashboard/upcoming-returns` — auth (scoped). 200 → allocations with `expected_return_date` within next 7 days, `status='active'`.
- **Business logic detail** — KPI definitions (authoritative counts):
  - `assets_available` = assets where status=Available.
  - `assets_allocated` = assets where status=Allocated.
  - `maintenance_today` = maintenance_requests created today OR resolved today (define as: `status IN (approved,technician_assigned,in_progress)` currently active) — use **active (open) maintenance requests** count; document choice.
  - `active_bookings` = bookings status IN (upcoming,ongoing).
  - `pending_transfers` = transfer_requests status='requested'.
  - `upcoming_returns` = active allocations with expected_return_date within next 7 days (and not overdue).
  - `overdue_returns` = allocations status='overdue' (from B-Phase 5).
  - **Scope filter:** department_head → filter allocations/bookings by their department_id; employee → by their own user id. If a source table is empty, counts are 0 (never error). This lets D build before B/C populate data.
- **UI components** (Screen 2): `Dashboard` — grid of `KpiCard` (title, value, icon), separate "Overdue Returns" (red) and "Upcoming Returns" panels, Quick Action buttons (Register Asset → assets, Book Resource → booking, Raise Maintenance → maintenance). States loading/empty/error.
- **Unit tests**:
  - `test_kpis_all_zero_on_empty_db`
  - `test_assets_available_counts_only_available_status`
  - `test_pending_transfers_counts_requested_only`
  - `test_overdue_vs_upcoming_returns_separated`
  - `test_department_head_scope_limits_counts`
- **Integration/API tests**: seed 2 available + 1 allocated asset, 1 requested transfer, 1 overdue allocation → KPIs reflect exact counts; dept_head token sees only own dept counts.
- **Acceptance criteria**:
  - [ ] All 7 KPI cards return correct counts from real tables.
  - [ ] Overdue separated from upcoming.
  - [ ] Scoped by role.
- **Commit checkpoint**: `feat(dashboard): KPI cards, overdue and upcoming returns endpoints`.

### Track D — Phase 3: Audit cycle creation + auditor assignment + item population
- **Goal**: Create audit cycles (scoped), assign auditors, and auto-populate `audit_items` for in-scope assets.
- **Depends on**: A-Phase 2 (departments for scope), A-Phase 4 (users as auditors), B-Phase 1 (assets to audit). Reads assets table.
- **Files**: `audit.routes.ts`, `audit.service.ts`, `audit.schema.ts`, `audit.test.ts`; frontend `pages/insights/Audit.tsx`, `pages/insights/AuditCycle.tsx`.
- **API endpoints**:
  - `POST /audit-cycles` — `requireRole('admin')` only (Admin owns cycle creation per product roles). Body `{ name, scope_department_id?, scope_location?, start_date, end_date }`. 201. On create, auto-populate `audit_items` (one per in-scope asset, `result=null`). Scope = assets matching dept (via current allocation/dept) AND/OR location; if both null → all non-Disposed assets. 422 if end_date<start_date.
  - `POST /audit-cycles/:id/auditors` — `requireRole('admin')`. Body `{ auditor_user_id }`. 201. 409 if already assigned. 404 cycle/user.
  - `DELETE /audit-cycles/:id/auditors/:auditorId` — admin. 204.
  - `GET /audit-cycles` — auth (managers all; assigned auditors see their cycles). Pagination + `?status=`.
  - `GET /audit-cycles/:id` — includes auditors + item count + progress (verified/total).
- **Business logic detail**:
  - Item population is a snapshot at creation time: query in-scope assets, bulk-insert `audit_items` with `@@unique([audit_cycle_id, asset_id])` so re-running is safe.
  - Scope resolution: `scope_location` matches `assets.location`; `scope_department_id` matches assets currently allocated to that dept (via active allocations) — document that scoping uses current allocation dept.
  - **API endpoints note:** create/assign = Admin; close + discrepancy resolution = Admin **or** Asset Manager (see D-P4).
  - Log `ACT.CREATE_AUDIT_CYCLE`. Notify assigned auditors (reuse notification helper; type can be generic or `AUDIT_DISCREPANCY` reserved for flags — use a plain notification message for assignment).
- **UI components** (Screen 8): `Audit` list of cycles (name, scope, date range, status, progress); `AuditCycle` detail with auditor management and item list. States loading/empty/error.
- **Unit tests**:
  - `test_create_cycle_populates_items_for_scope`
  - `test_scope_all_assets_when_no_scope_given`
  - `test_end_before_start_422`
  - `test_assign_duplicate_auditor_409`
  - `test_item_population_idempotent_unique_constraint`
- **Integration/API tests**: create cycle scoped to a location → items created only for that location's assets → assign 2 auditors → detail shows progress 0/N.
- **Acceptance criteria**:
  - [ ] Items auto-populate per scope.
  - [ ] Auditor assignment enforced unique.
- **Commit checkpoint**: `feat(audit): audit cycle creation, auditor assignment, item population`.

### Track D — Phase 4: Audit item verification + discrepancy report + close cycle
- **Goal**: Auditors mark items Verified/Missing/Damaged; system generates a discrepancy report; closing the cycle locks it and updates affected asset statuses (missing→Lost).
- **Depends on**: D-Phase 3, **B-Phase 2 (`transitionStatus` for setting Lost on close).**
- **Files**: extend `audit.routes.ts`/`audit.service.ts`; frontend `AuditCycle.tsx` (verification + report).
- **API endpoints**:
  - `PATCH /audit-items/:id` — auth: assigned auditor of that cycle (or admin/asset_manager). Body `{ result: verified|missing|damaged, notes? }`. 200; sets `verified_by`, `verified_at`. 403 if caller not an assigned auditor. 422 if cycle already `closed`.
  - `GET /audit-cycles/:id/discrepancy-report` — auth (managers + assigned auditors). 200 → `{ cycle, summary:{verified,missing,damaged,unchecked}, discrepancies:[{asset_tag,asset_name,result,notes,verified_by,verified_at}] }` (discrepancies = missing + damaged). Also downloadable form (see Reports Phase 5 export).
  - `POST /audit-cycles/:id/close` — `requireRole('admin','asset_manager')`. 200 → status `closed`. Side effect: for each item `result='missing'`, transition asset → `Lost` via `transitionStatus`. `damaged` items: leave a note / optionally flag for maintenance (out of scope to auto-create). 422 if already closed. Emits `NOTIF.AUDIT_DISCREPANCY` to cycle creator for each discrepancy.
- **Business logic detail**:
  - Verification only while cycle `open`; after close, items are read-only (422 on edit).
  - Close is transactional: set status closed + apply all missing→Lost transitions atomically. If any transition illegal (e.g. asset already Disposed), skip that one but record in metadata; do not fail the whole close.
  - Log `ACT.VERIFY_AUDIT_ITEM`, `ACT.CLOSE_AUDIT_CYCLE`.
- **UI components** (Screen 8): item verification list with Verified/Missing/Damaged radio per asset + notes; discrepancy report view (summary counts + flagged table); Close Cycle button (confirm modal). States loading/empty/error/locked.
- **Unit tests**:
  - `test_non_auditor_cannot_verify_403`
  - `test_verify_sets_verified_by_and_at`
  - `test_cannot_verify_after_close_422`
  - `test_discrepancy_report_lists_missing_and_damaged_only`
  - `test_close_sets_missing_assets_to_lost`
  - `test_close_skips_illegal_transition_but_completes`
  - `test_close_already_closed_422`
- **Integration/API tests**: assign auditor → auditor marks 1 verified, 1 missing, 1 damaged → discrepancy report shows 2 discrepancies + summary → close cycle → missing asset now `Lost`, cycle `closed`, further edits 422.
- **Acceptance criteria**:
  - [ ] Only assigned auditors verify; locking after close enforced.
  - [ ] Discrepancy report accurate.
  - [ ] Missing→Lost applied on close.
- **Commit checkpoint**: `feat(audit): item verification, discrepancy report, cycle close with status updates`.

### Track D — Phase 5: Reports & analytics + export, wire real dashboard triggers
- **Goal**: Deliver the analytics endpoints (utilization, maintenance frequency, due-for-maintenance/retirement, dept allocation summary, booking heatmap) with export, and confirm dashboard/notifications are wired to real data end-to-end.
- **Depends on**: B-Phases 1-5, C-Phases 1-5 (needs real allocation/booking/maintenance data), D-Phases 1-4.
- **Files**: `reports.routes.ts`, `reports.service.ts`, `reports.test.ts`; frontend `pages/insights/Reports.tsx`, chart components.
- **API endpoints** (auth: admin/asset_manager org-wide; department_head dept-scoped):
  - `GET /reports/asset-utilization` — 200 → per-asset `{ asset_tag, name, allocation_count, days_allocated, is_idle }`; most-used vs idle derivable (idle = never allocated). Supports `?from=&to=`.
  - `GET /reports/maintenance-frequency` — 200 → grouped by asset and by category `{ category, request_count }` / `{ asset_tag, request_count }`.
  - `GET /reports/due-for-attention` — 200 → assets nearing retirement (heuristic: status not Retired/Disposed and age from acquisition_date > threshold, threshold param `?years=`) + assets with high maintenance frequency.
  - `GET /reports/department-allocation` — 200 → per-department `{ department, active_allocations, total_asset_value }`.
  - `GET /reports/booking-heatmap` — 200 → counts bucketed by weekday × hour `{ weekday, hour, count }` for peak-usage visualization. `?resource_asset_id=` optional.
  - `GET /reports/export?report=<name>&format=csv` — 200 `text/csv` download of any of the above.
- **Business logic detail**:
  - Utilization: join allocations→assets; `days_allocated` = sum of (actual_return_date or now − allocated_date). Idle = zero allocations in range.
  - Heatmap: derive weekday (0-6) and hour (0-23) from booking start_time; count non-cancelled bookings.
  - Export: serialize the chosen report's rows to CSV with header row; set `Content-Disposition: attachment`.
  - **Final wiring pass:** verify every notification trigger (allocate, transfer, maintenance, booking, overdue, audit) actually fires by exercising flows; verify dashboard KPIs pull live data (no mock/fixtures remain). Replace any stub with real queries.
- **UI components** (Screen 9): `Reports` — tabbed charts (utilization bar, maintenance frequency, dept allocation, booking heatmap grid), export button per report. States loading/empty/error.
- **Unit tests**:
  - `test_utilization_marks_never_allocated_as_idle`
  - `test_utilization_days_allocated_computation`
  - `test_maintenance_frequency_grouped_by_category`
  - `test_department_allocation_sums_value`
  - `test_heatmap_buckets_by_weekday_hour`
  - `test_export_csv_has_header_and_rows`
- **Integration/API tests**: seed allocations/bookings/maintenance → each report returns non-empty correct aggregates → export returns CSV with matching row count → dashboard KPIs match report-derived numbers.
- **Acceptance criteria**:
  - [ ] All 5 report families implemented + CSV export.
  - [ ] No mock data remains; dashboard + notifications fully live.
- **Commit checkpoint**: `feat(reports): analytics endpoints, CSV export, live dashboard/notification wiring`.

---

## 2. Cross-Track Integration Points

Each row: producing phase must be merged to `develop` before the consuming phase can be fully verified. The contract column names the exact table/column or endpoint shape.

| # | Producer (track/phase) | Consumer (track/phase) | Contract |
|---|---|---|---|
| I1 | A-P0 (schema+migration) | ALL P0 of B/C/D | `backend/prisma/schema.prisma` + `0000_init` migration; every table exists with columns per §0.2. |
| I2 | A-P1 (`requireAuth`/`requireRole` in `shared/auth.ts`) | Every protected endpoint in B/C/D | Middleware exports; JWT payload `{sub,role,department_id}` per §0.3. |
| I3 | A-P3 (`GET /categories` + custom fields) | B-P1 (asset registration) | Category list w/ nested `custom_fields[{field_name,field_type}]`; B validates `assets.custom_fields` JSON against it. |
| I4 | A-P2/A-P4 (departments, users) | B-P3 (allocation targets), C-P1 (booking dept), D-P3 (audit scope/auditors) | `departments.id`, `users.id`, `users.role` FKs; only promoted users can approve per §0.8. |
| I5 | B-P2 (`assetService.transitionStatus`) | C-P4 (maintenance approve/resolve), D-P4 (audit close→Lost) | Frozen signature `transitionStatus(assetId,to,actorId,reason?)`; central state machine §Track B P2 table. |
| I6 | B-P1 (assets, `is_bookable`) | C-P1 (booking only bookable assets) | `assets.is_bookable=true` required to book; else 422. |
| I7 | B-P3/P4/P5 (allocations, transfers, overdue) | D-P2 (dashboard), D-P5 (reports) | Tables `allocations`(status active/returned/overdue), `transfer_requests`(status requested) read directly. |
| I8 | C-P1/P3/P5 (bookings) | D-P2 (active_bookings KPI), D-P5 (heatmap) | `bookings`(status, start_time,end_time) read directly. |
| I9 | C-P2/P4 (maintenance) | D-P2 (maintenance KPI), D-P5 (maintenance-frequency) | `maintenance_requests`(status, created_at, asset_id) read directly. |
| I10 | D-P1 (`createNotification`, `logActivity`) | A-P1 (signup/login logs), B-P3/4/5, C-P1/2/4/5 (notifications) | Frozen signatures §0.7; non-throwing. Until merged, callers use temporary no-op with identical signature. |
| I11 | B-P3 (409 holder payload) | B-P4 (transfer prefill UI) + Screen 5 | 409 body `details[0]={holder_user_id,holder_name}` drives "currently held by X" + Transfer button. |
| I12 | D-P4 (audit close → missing→Lost) | B (asset status), D-P2 (assets_available KPI) | Uses I5 transition; Lost assets excluded from Available count. |

**Sequencing guidance:** A-P0, A-P1, D-P1, and B-P2 are the four "unblockers" — prioritize merging them to `develop` early (target hour 1-2). I5 (transitionStatus) blocks C-P4 and D-P4, so B must merge P2 before C/D reach their hour-4 phases.

---

## 3. Test Strategy Summary

### 3.1 Consolidated test matrix

| Track | Phase | Unit tests | Integration tests | Manual QA |
|---|---|---|---|---|
| A | 0 | 4 | 1 | migrate on empty DB; `/health` in browser |
| A | 1 | 7 | 4 | signup→login→me in UI |
| A | 2 | 5 | 1 (multi-step) | create dept + hierarchy in Org UI |
| A | 3 | 4 | 1 | add category + custom fields in UI |
| A | 4 | 4 | 1 | promote a user, verify role change |
| A | 5 | 1 (parametrized ≥10) | 1 (per-role) | attempt forbidden action as each role |
| B | 0 | 1 | 1 | module boots |
| B | 1 | 8 | 1 | register asset, see AF-0001 + QR |
| B | 2 | 7 | 1 | search/filter + illegal transition |
| B | 3 | 8 | 1 | Priya/Raj double-alloc 409 in UI |
| B | 4 | 6 | 1 | transfer approve reallocates |
| B | 5 | 5 | 1 | overdue badge shows |
| C | 0 | 1 | 1 | module boots |
| C | 1 | 7 | 1 | Room B2 overlap example in UI |
| C | 2 | 7 | 1 | maintenance happy path |
| C | 3 | 5 | 1 | calendar renders, status auto-updates |
| C | 4 | 4 | 1 | approve→Under Maintenance, resolve→Available |
| C | 5 | 6 | 1 | cancel/reschedule/reminder |
| D | 0 | 1 | 1 | module boots |
| D | 1 | 5 | 1 | notification privacy in UI |
| D | 2 | 5 | 1 | KPI counts match seed |
| D | 3 | 5 | 1 | audit cycle items populate |
| D | 4 | 7 | 1 | verify + close → Lost |
| D | 5 | 6 | 1 | reports render + CSV export |
| **Total** | — | **~119** | **~24** | — |

### 3.2 Frameworks per layer
- **Backend unit:** Vitest. Pure service functions tested with a test Prisma client pointed at a disposable schema (`DATABASE_URL` → `assetflow_test`), reset between tests via `prisma migrate reset --force` in a global setup or truncation helper.
- **Backend integration:** Vitest + Supertest against the Express `app` from `app.ts` (no network port), seeded via helpers; each test file gets a clean DB (truncate all tables in `beforeEach`).
- **Frontend component:** Vitest + @testing-library/react; mock axios with MSW or a simple axios mock; assert loading/empty/error/success states of each screen component.

### 3.3 CI smoke test (must pass before ANY merge to `develop`)
`backend/package.json` script `verify`:
```
npm run build            # tsc --noEmit : type-checks all tracks' code
npx prisma validate      # schema.prisma is valid
npx prisma migrate deploy --preview-feature  # migrations apply cleanly on fresh test DB
npm run test -- --run    # full vitest suite (unit + integration) green
```
Additionally `npm --workspace frontend run build` (Vite production build succeeds). A GitHub Action (`.github/workflows/ci.yml`) spins a `postgres:16` service, runs `verify` on every PR to `develop`. **A red `verify` blocks merge.** Minimum bar even mid-hackathon: server boots (`/health` 200) + migrations apply + type-check passes.

---

## 4. Final Integration Checklist (Hour 7–8)

### 4.1 Merge & regression
1. Freeze feature work at hour 7. Each person: `git pull origin develop`, resolve conflicts (schema.prisma conflicts limited to your track's banner block), run `npm run verify`, push, final PR → `develop`.
2. On `develop`: run full `npm run verify` + `npm --workspace frontend run build`. All ~143 tests green.
3. Fast-forward `develop → main`; tag `v4`. (Earlier tags `v1`@hr2, `v2`@hr4, `v3`@hr6 should already exist.)
4. Run the seed script against a fresh DB and click through every screen manually (walkthrough below).

### 4.2 Seed data script (`backend/prisma/seed.ts`)
Create, in dependency-safe order (resolving the circular FK per §0.2.17):
1. Departments (head_user_id null): `Engineering`, `Facilities`, `IT` (IT parent = Engineering to show hierarchy).
2. Users (bcrypt-hashed password `Passw0rd!` for all demo accounts):
   - `admin@assetflow.dev` — role `admin`.
   - `manager@assetflow.dev` — role `asset_manager`, dept IT.
   - `head@assetflow.dev` — role `department_head`, dept Engineering.
   - `priya@assetflow.dev` — role `employee`, dept Engineering.
   - `raj@assetflow.dev` — role `employee`, dept Engineering.
3. Backfill department heads: Engineering.head = head user.
4. Categories: `Electronics` (custom field `warranty_months`:number), `Furniture`, `Vehicles`, `Rooms`.
5. Assets: `Laptop` (AF-0001, Electronics, Available) allocated to Priya (→ becomes Allocated, demonstrates I11); `Projector` (AF-0002, Electronics, Available); `Room B2` (AF-0003, Rooms, is_bookable=true); `Van` (AF-0004, Vehicles, is_bookable=true); plus one asset already `Under_Maintenance` and one `Retired` to show lifecycle variety.
6. One booking for Room B2 (9:00–10:00 today) to demo overlap.
7. One maintenance request (pending) on Projector.
8. One overdue allocation (expected_return_date in the past) to light up the dashboard.
9. One open audit cycle scoped to Engineering (**created by admin**) with `manager` + `head` as auditors and items populated.
Script must be idempotent (`prisma migrate reset --force && tsx prisma/seed.ts`).

### 4.3 Demo account credentials (put in root README)
| Role | Email | Password |
|---|---|---|
| Admin | admin@assetflow.dev | Passw0rd! |
| Asset Manager | manager@assetflow.dev | Passw0rd! |
| Department Head | head@assetflow.dev | Passw0rd! |
| Employee (Priya) | priya@assetflow.dev | Passw0rd! |
| Employee (Raj) | raj@assetflow.dev | Passw0rd! |

### 4.4 Demo walkthrough script (covers all 4 roles + all 10 screens)
1. **Admin** logs in → Dashboard (Screen 2) shows KPIs incl. 1 overdue return. → Org Setup (Screen 3): create a department, add `Electronics` custom field, promote Raj? (leave employee) — show role assignment is admin-only.
2. **Asset Manager** logs in → Asset Registry (Screen 4): register a new asset, watch tag auto-generate (AF-000X) + QR. Search/filter by category+status. Open asset detail → history timelines.
3. **Asset allocation (Screen 5):** attempt to allocate Priya's Laptop (AF-0001) to Raj → **409 "currently held by Priya" + Transfer button**. Click Transfer → request created. Manager approves → asset re-allocated to Raj, history auto-updated.
4. **Employee (Raj)** logs in → **Booking (Screen 6):** view Room B2 calendar (9:00–10:00 booked). Try 9:30–10:30 → rejected (overlap). Book 10:00–11:00 → success. → **Maintenance (Screen 7):** raise a request on his laptop (pending).
5. **Asset Manager** → approve the maintenance request → asset flips to **Under Maintenance**; assign technician → in progress → resolve → asset back to **Available**.
6. **Audit (Screen 8):** **Admin** opens/creates the audit cycle (or use seeded cycle); auditor marks one asset Missing, one Damaged → discrepancy report → **Asset Manager** (or Admin) closes cycle → missing asset becomes **Lost**.
7. **Reports (Screen 9):** show utilization, maintenance frequency, department allocation, booking heatmap; export a CSV.
8. **Notifications/Logs (Screen 10):** show each actor received relevant notifications (asset assigned, maintenance approved, transfer approved, booking confirmed, overdue alert, audit discrepancy) and the full activity log of who-did-what.
9. **Department Head** logs in → Dashboard is dept-scoped (only Engineering data), can approve within-dept **transfers** (cannot allocate — that is Asset Manager), cannot access Org Setup or create audit cycles (403).

### 4.5 Demo-readiness verification checklist
- [ ] All migrations applied on a fresh DB; seed runs clean.
- [ ] `/health` 200; frontend build served.
- [ ] Every one of the 10 screens reachable and functional with seeded data.
- [ ] RBAC: each demo role blocked from at least one forbidden action (verify 403s).
- [ ] The three "signature" business rules demonstrably work live: double-allocation 409, booking overlap 422, maintenance→status flip.
- [ ] ER diagram (`docs/ER_DIAGRAM.dbml`) present in repo root/docs.
- [ ] `v1..v4` tags exist on `main`; git log reads as scoped `feat(<module>)` history across all 4 members.
- [ ] Per-module `README.md` (ownership + endpoints) present in each `modules/*` folder.

---

### Screen → Track coverage map (no screen omitted)
| Screen (PDF) | Track / Phase |
|---|---|
| 1 Login/Signup | A-P1 |
| 2 Dashboard | D-P2 |
| 3 Org Setup (3 tabs) | A-P2 (Dept), A-P3 (Category), A-P4 (Directory/roles), A-P5 (UI polish) |
| 4 Asset Registration & Directory | B-P1 (register), B-P2 (search/history) |
| 5 Allocation & Transfer | B-P3 (allocation/return), B-P4 (transfer), B-P5 (overdue) |
| 6 Resource Booking | C-P1 (overlap), C-P3 (calendar), C-P5 (cancel/reschedule/reminder) |
| 7 Maintenance | C-P2 (workflow), C-P4 (status auto-update) |
| 8 Audit | D-P3 (cycle/auditors), D-P4 (verify/report/close) |
| 9 Reports & Analytics | D-P5 |
| 10 Activity Logs & Notifications | D-P1 |

**End of build specification. Implement track by track, phase by phase, committing at each checkpoint.**




