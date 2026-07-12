# AssetFlow — 8-Hour Build Plan (4-person team)

> **Canon:** Product goal + roles live in `BUILD_SPEC.md` §0.0 / §0.8. Implementation details live in `BUILD_SPEC.md`. Agent quick-ref: `ASSETFLOW.md`. **If this plan disagrees with `BUILD_SPEC.md`, follow `BUILD_SPEC.md`.**

## 1. Why schema-first matters here
Judges are scoring DB design + modularity, so the **entire team must agree on one ER diagram before anyone writes a single model**, or you'll get 4 incompatible foreign key sets by hour 3. Budget the first 30–40 min as a *synchronous* schema lock-in, not per-person work. The authoritative schema is **BUILD_SPEC §0.2** (also mirrored below for whiteboard speed).

---

## 2. Core Schema (lock this in Hour 0)

```
users
 id, name, email, password_hash, role[admin|asset_manager|department_head|employee],
 department_id -> departments.id, status[active|inactive], created_at

departments
 id, name, parent_department_id -> departments.id (self, nullable), head_user_id -> users.id (nullable),
 status[active|inactive]

asset_categories
 id, name

category_custom_fields
 id, category_id -> asset_categories.id, field_name, field_type

assets
 id, asset_tag (unique, auto AF-0001), name, category_id -> asset_categories.id,
 serial_number, acquisition_date, acquisition_cost, condition, location,
 is_bookable bool, qr_code, status[Available|Allocated|Reserved|Under Maintenance|Lost|Retired|Disposed],
 created_at

asset_documents
 id, asset_id -> assets.id, file_url, doc_type

allocations
 id, asset_id -> assets.id, employee_id -> users.id (nullable), department_id -> departments.id (nullable),
 allocated_date, expected_return_date, actual_return_date,
 status[active|returned|overdue], condition_notes_out, condition_notes_in

transfer_requests
 id, asset_id -> assets.id, from_user_id -> users.id, to_user_id -> users.id,
 requested_by -> users.id, approved_by -> users.id (nullable),
 status[requested|approved|rejected|completed], created_at

bookings
 id, resource_asset_id -> assets.id, booked_by_user_id -> users.id, department_id -> departments.id (nullable),
 start_time, end_time, status[upcoming|ongoing|completed|cancelled], created_at

maintenance_requests
 id, asset_id -> assets.id, raised_by -> users.id, issue_description, priority,
 photo_url, status[pending|approved|rejected|technician_assigned|in_progress|resolved],
 approved_by -> users.id (nullable), technician_name, created_at, resolved_at

audit_cycles
 id, name, scope_department_id -> departments.id (nullable), scope_location,
 start_date, end_date, status[open|closed], created_by -> users.id

audit_cycle_auditors
 id, audit_cycle_id -> audit_cycles.id, auditor_user_id -> users.id

audit_items
 id, audit_cycle_id -> audit_cycles.id, asset_id -> assets.id,
 result[verified|missing|damaged], notes, verified_by -> users.id, verified_at

notifications
 id, user_id -> users.id, type, message, related_entity_type, related_entity_id,
 is_read bool, created_at

activity_logs
 id, user_id -> users.id, action, entity_type, entity_id, metadata (json), created_at
```

**Gotcha to flag to the team:** `departments.head_user_id` and `users.department_id` reference each other. Create departments first with `head_user_id NULL`, insert users, then backfill — or just make the FK nullable and enforce in application logic. Mention this explicitly so nobody blocks on a chicken-and-egg migration.

---

## 3. Module Split (4 people)

| Person | Module | Screens owned | Depends on |
|---|---|---|---|
| **A — Foundation Lead** | Auth, Org Setup, RBAC | 1 (Login/Signup), 3 (Org Setup: Departments/Categories/Directory) | nothing — everyone else depends on A |
| **B — Assets** | Asset Registry, Allocation & Transfer | 4 (Registration & Directory), 5 (Allocation & Transfer) | A's user/department schema |
| **C — Operations** | Resource Booking, Maintenance | 6 (Booking), 7 (Maintenance) | A's schema, B's asset status enum + `transitionStatus` |
| **D — Insights** | Dashboard, Audit, Reports, Notifications/Logs | 2 (Dashboard), 8 (Audit), 9 (Reports), 10 (Logs/Notifications) | reads from B & C's tables (mostly aggregation, can stub with mock data early) |

**Role reminder (do not drift):** Signup → `employee` only. Admin promotes in Directory. **Only Admin + Asset Manager allocate.** Department Head **approves** dept transfers, does not allocate. Admin creates audit cycles; Asset Manager can close / resolve discrepancies. Forgot-password is out of scope.

Why this split works: A is the only true blocker (auth + org tables), so A should push migrations to `develop` within the first hour so B/C/D can build against real tables instead of guessing. D is naturally "last mile" — dashboards/reports/notifications consume everyone else's data, so give D room to stub with fixtures for the first few hours and wire up real queries in the back half.

---

## 4. Git Workflow (recommended revision to your plan)

Your instinct — hourly checkpoints, feature branches, tests before sync — is right. The one change I'd make: **replace "new release branch every hour" with a persistent `develop` integration branch + hourly tags.** Reasoning:

- 8 short-lived release branches in one day is mostly branch clutter for a repo judges will skim — they're not going to credit you extra for branch *count*, they'll look at commit history and PR merges as evidence of real parallel work.
- A single `develop` branch that all 4 feature branches merge into hourly gives you the same "visible integration cadence" via **tags** (`v0-hr1`, `v0-hr2`, …) without repeated branch-creation overhead and merge-base confusion.
- `main` stays clean and only receives tested, working states — good for a live demo fallback if something breaks in `develop` at hour 7.

```
main                    ← protected, only fast-forwarded from develop at checkpoints, tagged per merge
 └─ develop             ← integration branch, all feature branches merge here hourly
     ├─ feature/auth-orgsetup        (Person A)
     ├─ feature/assets-allocation    (Person B)
     ├─ feature/booking-maintenance  (Person C)
     └─ feature/audit-reports        (Person D)
```

**Hourly cadence per person:**
1. Commit to your own feature branch at least once/hour (small, atomic — this alone satisfies "1 commit/member/hour" even before any merge happens, so you're never blocked waiting on someone else).
2. At the top of each hour, open a PR `feature/x → develop`, one-line description, quick self-merge or 30-second teammate glance (no formal review needed at hackathon speed).
3. Run your module's test/lint script before merging (even a minimal smoke test — "does the server boot, does the migration apply" counts).
4. Every 2 hours, fast-forward/merge `develop → main`, tag it (`v1`, `v2`, `v3`, `v4`).

If you *want* the visual of more branches for the judges' sake, you can still cut a `release/hr-N` branch off `develop` at each 2-hour mark instead of merging straight to `main` — gives you a clean audit trail (`develop → release/hr2 → main`) without needing one per person per hour.

---

## 5. Hour-by-Hour Plan

| Hour | Everyone | A | B | C | D |
|---|---|---|---|---|---|
| 0–1 | Lock ER diagram, repo scaffold, branch setup, agree on API contract (route names, response shapes) | Push initial migrations for users/departments/categories | Draft asset model against agreed schema | Draft booking/maintenance models | Draft audit/notification models |
| 1–2 | First hourly commit + merge to `develop` | Auth (signup/login, JWT), role promotion endpoint | Asset CRUD + auto tag generation | Booking overlap validation logic | Notification schema + basic activity log writer |
| 2–3 | Merge + tag `v1` on `main` | Org Setup UI (3 tabs) | Asset search/filter, lifecycle status transitions | Maintenance workflow state machine | Dashboard KPI query stubs (mock data) |
| 3–4 | Hourly commit | Wire auth middleware into other modules | Allocation logic + conflict blocking | Booking calendar UI | Audit cycle creation + auditor assignment |
| 4–5 | Merge + tag `v2` | Support B/C/D integration issues | Transfer request workflow | Maintenance → asset status auto-update on approve/resolve | Audit item verification (Verified/Missing/Damaged) + discrepancy report generation |
| 5–6 | Hourly commit | Polish org setup, employee directory role assignment | Overdue return auto-flagging | Booking reminders / cancel-reschedule | Reports & analytics queries, replace mock data with real |
| 6–7 | Merge + tag `v3`, full integration pass together | Cross-check RBAC enforcement everywhere | Verify allocation conflict edge cases live | Verify overlap validation live | Wire real dashboard KPIs + notification triggers end-to-end |
| 7–8 | Final merge to `main`, tag `v4`, demo rehearsal, bug triage | — | — | — | — |

---

## 6. Judging-Optics Checklist
- Commit messages: `feat(assets): add allocation conflict check` style, scoped by module — makes the git log itself readable as documentation.
- Keep the ER diagram (`docs/ER_DIAGRAM.dbml`) in the repo — reviewers often check for this before opening any code.
- Each `README.md` per module folder briefly stating ownership + endpoints reinforces "modular design" without extra work.
- Don't skip the smoke test step before merging to `develop` — a broken `develop` branch two hours before demo is the single most common hackathon failure mode.
- **Demo the 3 hard rules live** (double-alloc 409, Room B2 overlap, maintenance approval→Under Maintenance) — this is the win path; see `ASSETFLOW.md` §15 / `BUILD_SPEC.md` §4.4.
- Screen coverage map is frozen in `BUILD_SPEC.md` (end of file) — every PDF screen maps to a track/phase.
