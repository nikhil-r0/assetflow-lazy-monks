/**
 * Phase 0 tests — module scaffolding only.
 * Database tests land in Phase 1 once PrismaClient wiring is confirmed.
 */
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

const app = createApp();

describe("insights module mounts (Phase 0)", () => {
  it("test_insights_module_mounts_ping", async () => {
    const res = await request(app).get("/api/v1/insights/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: "insights" });
  });

  it("test_dashboard_stub_mounts", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/kpis")
      .set("x-user-id", "1")
      .set("x-user-role", "admin");
    // Auth is applied only on Phase 1+ routes; stub returns 200
    expect([200, 401]).toContain(res.status);
  });

  it("test_audit_cycles_stub_mounts", async () => {
    const res = await request(app)
      .get("/api/v1/audit-cycles")
      .set("x-user-id", "1")
      .set("x-user-role", "admin");
    expect([200, 401]).toContain(res.status);
  });

  it("test_reports_stub_mounts", async () => {
    const res = await request(app)
      .get("/api/v1/reports/asset-utilization")
      .set("x-user-id", "1")
      .set("x-user-role", "admin");
    expect([200, 401]).toContain(res.status);
  });

  it("test_notifications_auth_guard_requires_credentials", async () => {
    // No auth headers → must reject with 401
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });

  it("test_activity_logs_auth_guard_requires_credentials", async () => {
    // No auth headers → must reject with 401
    const res = await request(app).get("/api/v1/activity-logs");
    expect(res.status).toBe(401);
  });
});
