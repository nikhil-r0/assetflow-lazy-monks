# Database seed design (idempotent)

**Date:** 2026-07-12  
**Status:** approved for implementation planning  
**Choice:** single Prisma seed file; skip/upsert (no wipe)

## Goal

Provide `backend/prisma/seed.ts` that inserts demo data into **every** application table so local/demo environments have a believable graph for Auth, Assets, Ops, and Insights — without deleting existing rows on re-run.

## Entry points

- File: `backend/prisma/seed.ts`
- Run: `cd backend && npm run seed` (wrapper around `tsx prisma/seed.ts`)
- Also wire Prisma: `package.json` / Prisma config `seed` so `npx prisma db seed` works
- Loads `DATABASE_URL` via `dotenv` and uses the same Prisma + `@prisma/adapter-pg` client pattern as the API

## Idempotency rules

| Entity | Match key | Behavior |
|--------|-----------|----------|
| `users` | `email` | upsert (refresh hash/role/status/name for known demo emails only) |
| `departments` | `name` | upsert |
| `asset_categories` | `name` | upsert |
| `category_custom_fields` | `category_id` + `field_name` | upsert |
| `assets` | `asset_tag` | upsert core fields; do not force-overwrite status if already diverged in a way that breaks FKs — prefer set demo status only on create; on update sync name/location/category/is_bookable |
| `asset_documents` | `asset_id` + `file_url` | create if missing |
| `allocations` | active row for demo asset + employee | create if missing |
| `transfer_requests` | demo asset + from/to + `requested` | create if missing |
| `bookings` | resource + booker + start/end fingerprint | create if missing |
| `maintenance_requests` | asset + raiser + description fingerprint | create if missing |
| `audit_cycles` | `name` (fixed demo name) | create if missing (or upsert by name if we add a unique — **no unique today**, so findFirst by name) |
| `audit_cycle_auditors` | cycle + user | upsert / skip |
| `audit_items` | cycle + asset | upsert / skip |
| `notifications` | user + type + message fingerprint | create if missing |
| `activity_logs` | user + action + entity fingerprint | create if missing |

Never `DELETE` / truncate. Test-only rows (e.g. `rbac-*@test.local`) are left untouched.

## Demo graph

Password for all demo users: `Passw0rd!` (bcrypt).

1. **Departments:** Engineering (head = dept head user), Sales  
2. **Users:**  
   - `admin@assetflow.dev` — admin  
   - `manager@assetflow.dev` — asset_manager  
   - `head@assetflow.dev` — department_head → Engineering  
   - `employee@assetflow.dev` (Priya) — employee → Engineering  
   - `sales@assetflow.dev` (Raj) — employee → Sales  
3. **Categories:** Laptop, Meeting Room (+ custom fields e.g. RAM, Capacity)  
4. **Assets:**  
   - `AF-0001` laptop — Allocated, docs URL  
   - `AF-ROOM1` meeting room — Available, `is_bookable`  
   - `AF-0002` spare laptop — Available (maint target)  
5. **Allocation:** Priya ← `AF-0001`, expected return in the past (overdue-eligible)  
6. **Transfer:** `requested` `AF-0001` Priya → Raj, requested by Raj  
7. **Bookings:** one upcoming on `AF-ROOM1` (employee)  
8. **Maintenance:** pending/high on `AF-0002` raised by employee  
9. **Audit:** open cycle “Q3 Demo Audit”, auditor = manager, items for `AF-0001` (verified) and `AF-0002` (missing)  
10. **Notifications / activity_logs:** a few rows referencing those entities  

Wire department `head_user_id` and user `department_id` after both sides exist (two-pass org seed).

## Ordering

Insert in FK-safe order:

`departments` (names only) → `users` → patch dept heads / user depts → `asset_categories` → `category_custom_fields` → `assets` → `asset_documents` → `allocations` → `transfer_requests` → `bookings` → `maintenance_requests` → `audit_cycles` → `audit_cycle_auditors` → `audit_items` → `notifications` → `activity_logs`

## Logging

Print one line per entity created vs skipped so re-runs are inspectable.

## Out of scope

- Wipe / reset mode  
- Production seeding  
- Real file uploads (URL strings only)  
- Guaranteeing exact integer IDs (use natural keys only)

## Success criteria

- Fresh DB after migrate + seed: login works for all five demo emails  
- Every table has ≥1 demo row  
- Second `npm run seed` exits 0 and does not duplicate fingerprint rows  
- Existing non-demo data remains
