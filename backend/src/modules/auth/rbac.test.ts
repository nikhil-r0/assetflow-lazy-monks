/**
 * Track A Phase 5 — RBAC matrix enforcement (≥10 role×endpoint cases).
 */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { Role } from "../../shared/enums.js";
import { prisma } from "../../shared/prisma.js";

const app = createApp();

function auth(userId: number, role: Role, deptId?: number | null) {
  const headers: Record<string, string> = {
    "x-user-id": String(userId),
    "x-user-role": role,
  };
  if (deptId != null) headers["x-user-dept-id"] = String(deptId);
  return headers;
}

type Case = {
  name: string;
  role: Role;
  method: "get" | "post" | "patch" | "delete";
  path: string;
  body?: Record<string, unknown>;
  expectStatus: number;
};

describe("test_rbac_matrix_enforced_matrix", () => {
  let adminId: number;
  let managerId: number;
  let headId: number;
  let employeeId: number;
  let deptA: number;
  let deptB: number;

  beforeAll(async () => {
    const suffix = Date.now();
    const a = await prisma.departments.create({ data: { name: `RBAC-A-${suffix}` } });
    const b = await prisma.departments.create({ data: { name: `RBAC-B-${suffix}` } });
    deptA = a.id;
    deptB = b.id;

    const admin = await prisma.users.create({
      data: {
        name: "RBAC Admin",
        email: `rbac-admin-${suffix}@test.local`,
        password_hash: "x",
        role: Role.admin,
      },
    });
    const manager = await prisma.users.create({
      data: {
        name: "RBAC Mgr",
        email: `rbac-mgr-${suffix}@test.local`,
        password_hash: "x",
        role: Role.asset_manager,
      },
    });
    const head = await prisma.users.create({
      data: {
        name: "RBAC Head",
        email: `rbac-head-${suffix}@test.local`,
        password_hash: "x",
        role: Role.department_head,
        department_id: deptA,
      },
    });
    const employee = await prisma.users.create({
      data: {
        name: "RBAC Emp",
        email: `rbac-emp-${suffix}@test.local`,
        password_hash: "x",
        role: Role.employee,
        department_id: deptA,
      },
    });
    adminId = admin.id;
    managerId = manager.id;
    headId = head.id;
    employeeId = employee.id;
  });

  const cases: Case[] = [];

  it("builds and runs ≥10 role×endpoint cases", async () => {
    const matrix: Case[] = [
      {
        name: "employee cannot create department",
        role: Role.employee,
        method: "post",
        path: "/api/v1/departments",
        body: { name: `Nope-${Date.now()}` },
        expectStatus: 403,
      },
      {
        name: "manager cannot create department",
        role: Role.asset_manager,
        method: "post",
        path: "/api/v1/departments",
        body: { name: `NopeMgr-${Date.now()}` },
        expectStatus: 403,
      },
      {
        name: "admin can create department",
        role: Role.admin,
        method: "post",
        path: "/api/v1/departments",
        body: { name: `OkDept-${Date.now()}` },
        expectStatus: 201,
      },
      {
        name: "employee cannot create category",
        role: Role.employee,
        method: "post",
        path: "/api/v1/categories",
        body: { name: `CatNope-${Date.now()}` },
        expectStatus: 403,
      },
      {
        name: "employee cannot promote roles",
        role: Role.employee,
        method: "patch",
        path: `/api/v1/users/${managerId}/role`,
        body: { role: Role.admin },
        expectStatus: 403,
      },
      {
        name: "manager cannot promote roles",
        role: Role.asset_manager,
        method: "patch",
        path: `/api/v1/users/${employeeId}/role`,
        body: { role: Role.asset_manager },
        expectStatus: 403,
      },
      {
        name: "employee cannot create asset",
        role: Role.employee,
        method: "post",
        path: "/api/v1/assets",
        body: { name: "X", category_id: 1 },
        expectStatus: 403,
      },
      {
        name: "employee cannot allocate",
        role: Role.employee,
        method: "post",
        path: "/api/v1/allocations",
        body: { asset_id: 1, employee_id: employeeId },
        expectStatus: 403,
      },
      {
        name: "employee cannot approve maintenance",
        role: Role.employee,
        method: "post",
        path: "/api/v1/maintenance-requests/1/approve",
        expectStatus: 403,
      },
      {
        name: "manager can list users is forbidden (admin only)",
        role: Role.asset_manager,
        method: "get",
        path: "/api/v1/users",
        expectStatus: 403,
      },
      {
        name: "admin can list users",
        role: Role.admin,
        method: "get",
        path: "/api/v1/users",
        expectStatus: 200,
      },
      {
        name: "employee can raise maintenance (auth ok path may 404 asset)",
        role: Role.employee,
        method: "post",
        path: "/api/v1/maintenance-requests",
        body: { asset_id: 999999, issue_description: "rbac raise" },
        expectStatus: 404,
      },
      {
        name: "department_head cannot create audit cycle",
        role: Role.department_head,
        method: "post",
        path: "/api/v1/audit-cycles",
        body: { name: "x", start_date: "2026-01-01", end_date: "2026-01-31" },
        expectStatus: 403,
      },
      {
        name: "admin can get assignable heads",
        role: Role.admin,
        method: "get",
        path: "/api/v1/users/assignable-heads",
        expectStatus: 200,
      },
    ];

    expect(matrix.length).toBeGreaterThanOrEqual(10);
    cases.push(...matrix);

    for (const c of matrix) {
      const userId =
        c.role === Role.admin
          ? adminId
          : c.role === Role.asset_manager
            ? managerId
            : c.role === Role.department_head
              ? headId
              : employeeId;
      const deptId = c.role === Role.department_head ? deptA : null;
      let req = request(app)[c.method](c.path).set(auth(userId, c.role, deptId));
      if (c.body) req = req.send(c.body);
      const res = await req;
      expect(res.status, c.name).toBe(c.expectStatus);
    }

    // Keep deptB referenced (outside-dept fixture available for future cases)
    expect(deptB).toBeGreaterThan(0);
  });

  it("integration: each role allowed + forbidden sample", async () => {
    // employee allowed: GET departments
    const empOk = await request(app)
      .get("/api/v1/departments")
      .set(auth(employeeId, Role.employee));
    expect(empOk.status).toBe(200);

    const empForbidden = await request(app)
      .post("/api/v1/departments")
      .set(auth(employeeId, Role.employee))
      .send({ name: `emp-forbid-${Date.now()}` });
    expect(empForbidden.status).toBe(403);

    const mgrOk = await request(app)
      .get("/api/v1/categories")
      .set(auth(managerId, Role.asset_manager));
    expect(mgrOk.status).toBe(200);

    const mgrForbidden = await request(app)
      .post("/api/v1/categories")
      .set(auth(managerId, Role.asset_manager))
      .send({ name: `mgr-forbid-${Date.now()}` });
    expect(mgrForbidden.status).toBe(403);

    const headOk = await request(app)
      .get("/api/v1/operations/ping")
      .set(auth(headId, Role.department_head, deptA));
    expect(headOk.status).toBe(200);

    const headForbidden = await request(app)
      .post("/api/v1/assets")
      .set(auth(headId, Role.department_head, deptA))
      .send({ name: "x", category_id: 1 });
    expect(headForbidden.status).toBe(403);

    const adminOk = await request(app)
      .get("/api/v1/users/assignable-heads")
      .set(auth(adminId, Role.admin));
    expect(adminOk.status).toBe(200);
    expect(Array.isArray(adminOk.body.data)).toBe(true);

    const adminForbiddenAsEmp = await request(app)
      .patch(`/api/v1/users/${adminId}/role`)
      .set(auth(adminId, Role.admin))
      .send({ role: Role.employee });
    // self-demote blocked as 422 (not 403) — still unauthorized action outcome
    expect([403, 422]).toContain(adminForbiddenAsEmp.status);
  });
});
