# AssetFlow — Engineering & Agent Reference Guide

> **If anything here disagrees with local `BUILD_SPEC.md`, BUILD_SPEC wins.**  
> For “what’s done right now,” see **`STATUS.md`**.

### Document map
| Doc | Use when you need… |
|---|---|
| `BUILD_SPEC.md` (local) | Exact columns, endpoints, phase acceptance, tests |
| `STATUS.md` | Current progress / blockers / next steps |
| `AssetFlow_Hackathon_Plan.md` | Hour-by-hour + who owns which screen |
| **This file** | Thesis, hard rules, conventions, demo script |

---

## 0. TL;DR

- **Stack:** Node 20 + Express + TypeScript + Prisma + PostgreSQL · React 18 + Vite + TanStack Query + Tailwind · Vitest + Supertest · npm workspaces (`backend/`, `frontend/`)
- **Rules in services**, never controllers/React. Central asset writer: `transitionStatus` / `transitionStatusPure`.
- **3 hard rules** win the demo (double-alloc, booking overlap, maintenance gate).
- **Roles never self-assigned.** Signup → `employee`. Admin promotes in Directory only.
- **Demo off `main`.** Integrate on `develop`.

---

## 1. Product (10 screens)

1. Login / Signup (employee-only)  
2. Dashboard KPIs (+ overdue vs upcoming)  
3. Org Setup — Depts / Categories / Directory (Admin)  
4. Asset Registration & Directory  
5. Allocation & Transfer  
6. Resource Booking  
7. Maintenance  
8. Asset Audit  
9. Reports & Analytics  
10. Notifications & Activity Logs  

**Out of scope:** purchasing/invoicing/accounting · forgot-password email · multipart uploads (URL strings only).

---

## 2. Winning thesis

Judges score **correct domain logic + believable RBAC + unbroken demo**.  
All 10 screens exist; **hero flows** (alloc/transfer, booking, maintenance, audit) must be flawless. **Show the rejections live.**

---

## 3. Tracks (ownership)

| Track | Screens | Critical deliverable |
|---|---|---|
| **A** | 1, 3 | Auth + org master data |
| **B** | 4, 5 | Registry + **Rule 1** + transfers + overdue |
| **C** | 6, 7 | **Rule 2** booking + **Rule 3** maintenance |
| **D** | 2, 8, 9, 10 | KPIs, audit cycles, reports, notif/logs |

**Critical path:** A schema/auth → B `transitionStatus` → C status flips / D audit close.

---

## 4. The 3 hard rules

### Rule 1 — No double allocation (Track B)
Active allocation exists → **409 CONFLICT** with `holder_name` → UI “Request Transfer”.

### Rule 2 — Booking overlap (Track C)
Half-open `[start, end)`. 09:00–10:00 vs 09:30–10:30 **reject**; vs 10:00–11:00 **accept**.

### Rule 3 — Maintenance gate (Track C + B machine)
`Under_Maintenance` only via approve maintenance — not a free status edit.

---

## 5. Roles (quick)

| | Admin | Asset Mgr | Dept Head | Employee |
|---|:--:|:--:|:--:|:--:|
| Org + promote | ✅ | | | |
| Register / allocate | ✅ | ✅ | | |
| Approve transfer | ✅ | ✅ | ✅ dept | |
| Create audit cycle | ✅ | | | |
| Close audit / discrepancy | ✅ | ✅ | | |
| Book / raise maint / request transfer | ✅ | ✅ | ✅ | ✅ |

---

## 6. Repo layout

```
backend/src/
  shared/           # enums, errors (A expands: auth, activity, notify)
  modules/assets/   # Track B  ← scaffolded
  modules/auth/     # Track A  (TODO)
  modules/operations/  # Track C (TODO)
  modules/insights/    # Track D (TODO)
frontend/src/pages/{auth,org,assets,ops,insights}/
```

API base: `/api/v1`. Errors: `{ error: { code, message, details? } }`.

---

## 7. Track B early scaffold (already in repo)

- `GET /api/v1/assets/ping` → `{ module: "assets" }`
- `transitionStatusPure` / `canTransition` — legal edges from BUILD_SPEC
- `buildAlreadyAllocatedConflict` — 409 shape for Priya/Raj demo
- Service methods stubbed with `NotImplemented` until A auth + later B phases
- Tests: `cd backend && npm test`

**Do next on B:** wait for A auth/categories → Phase 1 CRUD + auto `AF-0001`.

---

## 8. Demo script (story, not feature tour)

1. Admin: org setup + promote (no self-roles)  
2. Manager: register laptop → allocate Priya (past return → overdue)  
3. **Money shot:** Raj allocate same → blocked → Transfer → approve  
4. Room B2 overlap reject / adjacent accept  
5. Maint: approve → Under Maintenance → resolve → Available  
6. Audit Missing → discrepancy → close → Lost  
7. Dashboard + notifications + flash hard-rule tests  

Full seed walkthrough: `BUILD_SPEC.md` §4.4.

---

## 9. Definition of Done

- [ ] Matches BUILD_SPEC acceptance for that phase  
- [ ] Rule in service; `requireRole` on writes  
- [ ] Zod body; asset status via transition helper  
- [ ] activity/notify where specified  
- [ ] UI reflects state; `develop` still green  
- [ ] Hard-rule change → Vitest coverage  

---

## 10. One-liner

Admin sets org + roles → Manager registers/allocates (conflicts blocked) → staff book/maintain (overlaps rejected, maint gated) → audits flag gaps → dashboard/logs stay live. Feature-sliced Express+Prisma, React role UI, Vitest on the 3 hard rules.
