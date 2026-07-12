# AssetFlow — Live Status

> Update this file when a track merges a phase. Keep it short so the team can glance and know what to do.

**Last updated:** 2026-07-12 · Branch of record for integration: `develop`

---

## What’s done

| Item | Where | Who |
|---|---|---|
| Monorepo + Prisma schema | `develop` | A / shared |
| Track B Phase 0 scaffold | `develop` (PR #2) | B |
| Tag gen + custom-field validators + FE shells | `feature/assets-phase1-prep` | B |
| Pure state machine + 409 conflict shape | `backend/src/modules/assets/` | B |

## What’s NOT done (blockers)

| Missing | Blocks | Owner |
|---|---|---|
| Prisma 7 datasource fix + `prisma generate` + migrations | Real DB writes | A |
| Auth: signup/login/JWT + `requireAuth` / `requireRole` | Protected B/C/D routes | A |
| Categories + custom field APIs | B asset registration | A |
| Employee directory + promote | RBAC demo | A |
| `createNotification` / `logActivity` | B/C notify calls | D |
| DB-backed `transitionStatus` | C maint / D audit Lost | B (after Prisma) |
| Booking / maintenance | Screens 6–7 | C |
| Dashboard / audit / reports | Screens 2, 8–10 | D |

---

## Track cheat sheet

### Track A — Auth & Org (Screens 1, 3)
**Next:** Auth Phase 1 (employee-only signup, JWT, middleware) → Org tabs.  
**Unblocks:** Everyone.

### Track B — Assets (Screens 4, 5) ← early work started
**Done:** Module ping, service stubs, `transitionStatusPure`, conflict payload, Vitest (6 passing).  
**Next (after A auth + categories):** Phase 1 asset CRUD + `AF-0001` tags → Phase 2 DB `transitionStatus` → Phase 3 allocate (Rule 1 money shot) → transfer → overdue.  
**Branch:** `feature/assets-allocation`

### Track C — Operations (Screens 6, 7)
**Next:** Scaffold ops module; overlap algorithm can be coded as pure functions now. Wire routes after A auth; status flips after B Phase 2.

### Track D — Insights (Screens 2, 8, 9, 10)
**Next:** Notification/activity helpers early (everyone imports them). Dashboard KPI stubs can return zeros until B/C have data.

---

## The 3 hard rules (demo these live)

1. **B** — Double allocation → **409** + “held by Priya” + Transfer CTA  
2. **C** — Booking overlap half-open `[start,end)` — adjacent OK, overlap reject  
3. **C** (+ B status machine) — Under Maintenance **only** after maintenance approve  

---

## Git reminder

```
feature/<track>-…  →  PR → develop  →  (checkpoints) main
```

Run `npm test` in `backend/` before merging asset work. Don’t commit `BUILD_SPEC.md` (gitignored — keep a local copy).
