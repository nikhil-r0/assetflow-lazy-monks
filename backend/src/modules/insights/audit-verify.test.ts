import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, AuditResult } from "../../shared/enums.js";

const app = createApp();

describe("Audit Phase 4 — Item Verification, Discrepancy Report, Close Cycle", () => {
  let adminUser: any;
  let auditorUser: any;
  let outsiderUser: any;
  let category: any;
  let assetVerified: any;
  let assetMissing: any;
  let assetDamaged: any;
  let assetDisposed: any;
  let cycle: any;

  beforeAll(async () => {
    await prisma.audit_cycle_auditors.deleteMany();
    await prisma.audit_items.deleteMany();
    await prisma.audit_cycles.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany();
    await prisma.departments.deleteMany();

    category = await prisma.asset_categories.create({ data: { name: "P4-Laptops" } });

    adminUser = await prisma.users.create({
      data: { name: "P4-Admin", email: "p4admin@af.dev", password_hash: "h", role: Role.admin },
    });
    auditorUser = await prisma.users.create({
      data: { name: "P4-Auditor", email: "p4aud@af.dev", password_hash: "h", role: Role.employee },
    });
    outsiderUser = await prisma.users.create({
      data: { name: "P4-Outsider", email: "p4out@af.dev", password_hash: "h", role: Role.employee },
    });

    // Create assets
    assetVerified = await prisma.assets.create({ data: { asset_tag: "P4-001", name: "Asset Verified", category_id: category.id, status: AssetStatus.Available } });
    assetMissing = await prisma.assets.create({ data: { asset_tag: "P4-002", name: "Asset Missing", category_id: category.id, status: AssetStatus.Available } });
    assetDamaged = await prisma.assets.create({ data: { asset_tag: "P4-003", name: "Asset Damaged", category_id: category.id, status: AssetStatus.Available } });
    assetDisposed = await prisma.assets.create({ data: { asset_tag: "P4-004", name: "Already Disposed", category_id: category.id, status: AssetStatus.Disposed } });

    // Create cycle (global scope - excludes disposed)
    const res = await request(app)
      .post("/api/v1/audit-cycles")
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({ name: "P4 Test Cycle", start_date: "2026-07-01", end_date: "2026-07-31" });
    cycle = res.body;

    // Assign auditorUser
    await request(app)
      .post(`/api/v1/audit-cycles/${cycle.id}/auditors`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role)
      .send({ auditor_user_id: auditorUser.id });
  });

  afterAll(async () => {
    await prisma.audit_cycle_auditors.deleteMany();
    await prisma.audit_items.deleteMany();
    await prisma.audit_cycles.deleteMany();
    await prisma.allocations.deleteMany();
    await prisma.assets.deleteMany();
    await prisma.asset_categories.deleteMany();
    await prisma.users.deleteMany({ where: { email: { endsWith: "@af.dev" } } });
    await prisma.$disconnect();
  });

  it("test_non_auditor_cannot_verify_403", async () => {
    // Get the item for assetVerified
    const detail = await request(app)
      .get(`/api/v1/audit-cycles/${cycle.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);
    const item = detail.body.items.find((i: any) => i.asset_id === assetVerified.id);

    const res = await request(app)
      .patch(`/api/v1/audit-items/${item.id}`)
      .set("x-user-id", String(outsiderUser.id))
      .set("x-user-role", outsiderUser.role)
      .send({ result: "verified" });

    expect(res.status).toBe(403);
  });

  it("test_verify_sets_verified_by_and_at", async () => {
    const detail = await request(app)
      .get(`/api/v1/audit-cycles/${cycle.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);
    const item = detail.body.items.find((i: any) => i.asset_id === assetVerified.id);

    const res = await request(app)
      .patch(`/api/v1/audit-items/${item.id}`)
      .set("x-user-id", String(auditorUser.id))
      .set("x-user-role", auditorUser.role)
      .send({ result: AuditResult.verified });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe(AuditResult.verified);
    expect(res.body.verified_by).toBe(auditorUser.id);
    expect(res.body.verified_at).toBeTruthy();
  });

  it("test_discrepancy_report_lists_missing_and_damaged_only", async () => {
    // Mark assetMissing and assetDamaged
    const detail = await request(app)
      .get(`/api/v1/audit-cycles/${cycle.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    const missingItem = detail.body.items.find((i: any) => i.asset_id === assetMissing.id);
    const damagedItem = detail.body.items.find((i: any) => i.asset_id === assetDamaged.id);

    await request(app)
      .patch(`/api/v1/audit-items/${missingItem.id}`)
      .set("x-user-id", String(auditorUser.id))
      .set("x-user-role", auditorUser.role)
      .send({ result: AuditResult.missing, notes: "Cannot locate" });

    await request(app)
      .patch(`/api/v1/audit-items/${damagedItem.id}`)
      .set("x-user-id", String(auditorUser.id))
      .set("x-user-role", auditorUser.role)
      .send({ result: AuditResult.damaged, notes: "Cracked screen" });

    const res = await request(app)
      .get(`/api/v1/audit-cycles/${cycle.id}/discrepancy-report`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(res.body.summary.missing).toBe(1);
    expect(res.body.summary.damaged).toBe(1);
    expect(res.body.summary.verified).toBe(1);
    expect(res.body.discrepancies.length).toBe(2);
    const tags = res.body.discrepancies.map((d: any) => d.asset_tag);
    expect(tags).toContain("P4-002");
    expect(tags).toContain("P4-003");
    expect(tags).not.toContain("P4-001");
  });

  it("test_close_sets_missing_assets_to_lost", async () => {
    const res = await request(app)
      .post(`/api/v1/audit-cycles/${cycle.id}/close`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");

    // assetMissing should now be Lost
    const updatedAsset = await prisma.assets.findUnique({ where: { id: assetMissing.id } });
    expect(updatedAsset?.status).toBe(AssetStatus.Lost);

    // assetVerified should be untouched (still Available)
    const verifiedAsset = await prisma.assets.findUnique({ where: { id: assetVerified.id } });
    expect(verifiedAsset?.status).toBe(AssetStatus.Available);
  });

  it("test_cannot_verify_after_close_422", async () => {
    const detail = await request(app)
      .get(`/api/v1/audit-cycles/${cycle.id}`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);
    const item = detail.body.items[0];

    const res = await request(app)
      .patch(`/api/v1/audit-items/${item.id}`)
      .set("x-user-id", String(auditorUser.id))
      .set("x-user-role", auditorUser.role)
      .send({ result: AuditResult.verified });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("CYCLE_CLOSED");
  });

  it("test_close_already_closed_422", async () => {
    const res = await request(app)
      .post(`/api/v1/audit-cycles/${cycle.id}/close`)
      .set("x-user-id", String(adminUser.id))
      .set("x-user-role", adminUser.role);

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("ALREADY_CLOSED");
  });
});
