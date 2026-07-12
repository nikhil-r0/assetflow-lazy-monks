import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, AuditStatus } from "../../shared/enums.js";

const app = createApp();

describe("Audit Cycles Module (Phase 3)", () => {
  let adminUser: any;
  let managerUser: any;
  let auditorUser1: any;
  let auditorUser2: any;
  let normalEmployee: any;
  let dept1: any;
  let category: any;
  let asset1: any;
  let asset2: any;
  let asset3: any;

  beforeAll(async () => {
    // Clean up
    await prisma.audit_cycle_auditors.deleteMany();
    await prisma.audit_items.deleteMany();
    await prisma.audit_cycles.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany();
    await prisma.departments.deleteMany();

    // 1. Seed org
    dept1 = await prisma.departments.create({ data: { name: "Audit-Eng" } });

    // 2. Seed users
    adminUser = await prisma.users.create({
      data: {
        name: "Audit-Admin",
        email: "a-admin@assetflow.dev",
        password_hash: "hash",
        role: Role.admin,
      },
    });

    managerUser = await prisma.users.create({
      data: {
        name: "Audit-Manager",
        email: "a-mgr@assetflow.dev",
        password_hash: "hash",
        role: Role.asset_manager,
      },
    });

    auditorUser1 = await prisma.users.create({
      data: {
        name: "Audit-Auditor-1",
        email: "a-aud1@assetflow.dev",
        password_hash: "hash",
        role: Role.employee,
        department_id: dept1.id,
      },
    });

    auditorUser2 = await prisma.users.create({
      data: {
        name: "Audit-Auditor-2",
        email: "a-aud2@assetflow.dev",
        password_hash: "hash",
        role: Role.employee,
      },
    });

    normalEmployee = await prisma.users.create({
      data: {
        name: "Audit-Normal",
        email: "a-normal@assetflow.dev",
        password_hash: "hash",
        role: Role.employee,
      },
    });

    // 3. Seed category
    category = await prisma.asset_categories.create({ data: { name: "Audit-Laptops" } });

    // 4. Seed assets
    asset1 = await prisma.assets.create({
      data: {
        asset_tag: "TAG-AUD-001",
        name: "Laptop 1 (Eng Dept / Office Location)",
        category_id: category.id,
        status: AssetStatus.Allocated,
        location: "Office",
      },
    });

    asset2 = await prisma.assets.create({
      data: {
        asset_tag: "TAG-AUD-002",
        name: "Laptop 2 (Remote Location)",
        category_id: category.id,
        status: AssetStatus.Available,
        location: "Remote",
      },
    });

    asset3 = await prisma.assets.create({
      data: {
        asset_tag: "TAG-AUD-003",
        name: "Laptop 3 (Disposed)",
        category_id: category.id,
        status: AssetStatus.Disposed,
        location: "Office",
      },
    });

    // Allocate asset1 to dept1
    await prisma.allocations.create({
      data: {
        asset_id: asset1.id,
        department_id: dept1.id,
        status: AllocStatus.active,
      },
    });
  });

  afterAll(async () => {
    await prisma.audit_cycle_auditors.deleteMany();
    await prisma.audit_items.deleteMany();
    await prisma.audit_cycles.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany({ where: { email: { endsWith: "@assetflow.dev" } } });
    await prisma.departments.deleteMany({ where: { name: { startsWith: "Audit-" } } });
    await prisma.$disconnect();
  });

  it("test_end_before_start_422", async () => {
    const res = await request(app)
      .post("/api/v1/audit-cycles")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({
        name: "Cycle End Before Start",
        start_date: "2026-07-20",
        end_date: "2026-07-10",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("END_DATE_BEFORE_START_DATE");
  });

  it("test_scope_all_assets_when_no_scope_given", async () => {
    // Should include all non-disposed assets: asset1 and asset2 (asset3 is Disposed)
    const res = await request(app)
      .post("/api/v1/audit-cycles")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({
        name: "Global Q3 Audit",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Global Q3 Audit");

    // Fetch details to verify populated items
    const detailRes = await request(app)
      .get(`/api/v1/audit-cycles/${res.body.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.summary.total).toBe(2);
    const assetIds = detailRes.body.items.map((i: any) => i.asset_id);
    expect(assetIds).toContain(asset1.id);
    expect(assetIds).toContain(asset2.id);
    expect(assetIds).not.toContain(asset3.id);
  });

  it("test_create_cycle_populates_items_for_scope", async () => {
    // Scope: Office location only
    const resLocation = await request(app)
      .post("/api/v1/audit-cycles")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({
        name: "Office Specific Audit",
        scope_location: "Office",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      });

    expect(resLocation.status).toBe(201);
    const detailLoc = await request(app)
      .get(`/api/v1/audit-cycles/${resLocation.body.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(detailLoc.body.summary.total).toBe(1); // Only asset1 (asset3 is disposed)
    expect(detailLoc.body.items[0].asset_id).toBe(asset1.id);

    // Scope: Eng Dept only
    const resDept = await request(app)
      .post("/api/v1/audit-cycles")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({
        name: "Eng Dept Audit",
        scope_department_id: dept1.id,
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      });

    expect(resDept.status).toBe(201);
    const detailDept = await request(app)
      .get(`/api/v1/audit-cycles/${resDept.body.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(detailDept.body.summary.total).toBe(1); // Only asset1 allocated to Eng
    expect(detailDept.body.items[0].asset_id).toBe(asset1.id);
  });

  describe("Auditor Assignment & Management", () => {
    let cycle: any;

    beforeAll(async () => {
      // Create a fresh cycle
      const res = await request(app)
        .post("/api/v1/audit-cycles")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role)
        .send({
          name: "Assignment Test Cycle",
          start_date: "2026-07-01",
          end_date: "2026-07-31",
        });
      cycle = res.body;
    });

    it("test_assign_duplicate_auditor_409", async () => {
      // First assignment
      const res1 = await request(app)
        .post(`/api/v1/audit-cycles/${cycle.id}/auditors`)
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role)
        .send({ auditor_user_id: auditorUser1.id });

      expect(res1.status).toBe(201);

      // Duplicate assignment
      const res2 = await request(app)
        .post(`/api/v1/audit-cycles/${cycle.id}/auditors`)
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role)
        .send({ auditor_user_id: auditorUser1.id });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toBe("AUDITOR_ALREADY_ASSIGNED");
    });

    it("test_scoping_limits_cycle_access_and_visibility", async () => {
      // 1. Normal employee tries to access details of the cycle -> 403
      const resDetailNormal = await request(app)
        .get(`/api/v1/audit-cycles/${cycle.id}`)
        .set("x-user-id", String(normalEmployee.id))
        .set("x-user-role", normalEmployee.role);

      expect(resDetailNormal.status).toBe(403);
      expect(resDetailNormal.body.error).toBe("UNAUTHORIZED_CYCLE_ACCESS");

      // 2. Assigned auditor tries to access details of the cycle -> 200
      const resDetailAuditor = await request(app)
        .get(`/api/v1/audit-cycles/${cycle.id}`)
        .set("x-user-id", String(auditorUser1.id))
        .set("x-user-role", auditorUser1.role);

      expect(resDetailAuditor.status).toBe(200);

      // 3. Normal employee lists audit cycles -> sees 0 cycles
      const resListNormal = await request(app)
        .get("/api/v1/audit-cycles")
        .set("x-user-id", String(normalEmployee.id))
        .set("x-user-role", normalEmployee.role);

      expect(resListNormal.status).toBe(200);
      expect(resListNormal.body.data.length).toBe(0);

      // 4. Assigned auditor lists audit cycles -> sees the assigned cycle
      const resListAuditor = await request(app)
        .get("/api/v1/audit-cycles")
        .set("x-user-id", String(auditorUser1.id))
        .set("x-user-role", auditorUser1.role);

      expect(resListAuditor.status).toBe(200);
      expect(resListAuditor.body.data.length).toBe(1);
      expect(resListAuditor.body.data[0].id).toBe(cycle.id);

      // 5. Admin lists audit cycles -> sees all cycles
      const resListAdmin = await request(app)
        .get("/api/v1/audit-cycles")
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(resListAdmin.status).toBe(200);
      expect(resListAdmin.body.data.length).toBeGreaterThanOrEqual(3); // The global, specific, and assignment cycles
    });

    it("test_remove_auditor_and_revoke_access", async () => {
      // Remove auditorUser1
      const resRemove = await request(app)
        .delete(`/api/v1/audit-cycles/${cycle.id}/auditors/${auditorUser1.id}`)
        .set("x-user-id", String(adminUser.id))
        .set("x-user-role", adminUser.role);

      expect(resRemove.status).toBe(204);

      // Verify auditorUser1 now gets 403 on details
      const resDetailAfter = await request(app)
        .get(`/api/v1/audit-cycles/${cycle.id}`)
        .set("x-user-id", String(auditorUser1.id))
        .set("x-user-role", auditorUser1.role);

      expect(resDetailAfter.status).toBe(403);
    });
  });
});
