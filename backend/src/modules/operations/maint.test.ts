import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { MaintStatus, Priority, Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { prisma } from "../../shared/prisma.js";
import { assertMaintTransition, canTransitionMaint } from "./maintStatus.js";

const app = createApp();

function authHeaders(userId: number, role: Role) {
  return {
    "x-user-id": String(userId),
    "x-user-role": role,
  };
}

describe("maintenance workflow state machine (pure)", () => {
  it("test_pending_to_approved_ok", () => {
    expect(canTransitionMaint(MaintStatus.pending, MaintStatus.approved)).toBe(true);
    expect(() =>
      assertMaintTransition(MaintStatus.pending, MaintStatus.approved),
    ).not.toThrow();
  });

  it("test_pending_to_in_progress_rejected_422", () => {
    expect(canTransitionMaint(MaintStatus.pending, MaintStatus.in_progress)).toBe(false);
    try {
      assertMaintTransition(MaintStatus.pending, MaintStatus.in_progress);
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).httpStatus).toBe(422);
      expect((err as AppError).code).toBe("UNPROCESSABLE");
    }
  });

  it("test_approve_non_pending_422", () => {
    expect(canTransitionMaint(MaintStatus.approved, MaintStatus.approved)).toBe(false);
    expect(canTransitionMaint(MaintStatus.rejected, MaintStatus.approved)).toBe(false);
  });

  it("test_reject_is_terminal_cannot_reopen", () => {
    expect(canTransitionMaint(MaintStatus.rejected, MaintStatus.pending)).toBe(false);
    expect(() =>
      assertMaintTransition(MaintStatus.rejected, MaintStatus.approved),
    ).toThrow(AppError);
  });

  it("test_full_happy_path_pending_to_resolved", () => {
    const path: MaintStatus[] = [
      MaintStatus.pending,
      MaintStatus.approved,
      MaintStatus.technician_assigned,
      MaintStatus.in_progress,
      MaintStatus.resolved,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionMaint(path[i]!, path[i + 1]!)).toBe(true);
    }
  });
});

describe("maintenance API workflow", () => {
  let employeeId: number;
  let managerId: number;
  let assetId: number;
  let categoryId: number;

  beforeAll(async () => {
    const suffix = Date.now();
    const employee = await prisma.users.create({
      data: {
        name: "Maint Employee",
        email: `maint-emp-${suffix}@test.local`,
        password_hash: "x",
        role: Role.employee,
      },
    });
    const manager = await prisma.users.create({
      data: {
        name: "Maint Manager",
        email: `maint-mgr-${suffix}@test.local`,
        password_hash: "x",
        role: Role.asset_manager,
      },
    });
    const category = await prisma.asset_categories.create({
      data: { name: `MaintCat-${suffix}` },
    });
    const asset = await prisma.assets.create({
      data: {
        asset_tag: `AF-M${suffix % 10000}`,
        name: "Maint Test Asset",
        category_id: category.id,
        status: "Available",
      },
    });
    employeeId = employee.id;
    managerId = manager.id;
    assetId = asset.id;
    categoryId = category.id;
  });

  it("test_raise_creates_pending_request", async () => {
    const res = await request(app)
      .post("/api/v1/maintenance-requests")
      .set(authHeaders(employeeId, Role.employee))
      .send({
        asset_id: assetId,
        issue_description: "Screen cracked",
        priority: Priority.high,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe(MaintStatus.pending);
    expect(res.body.raised_by).toBe(employeeId);
    expect(res.body.asset_id).toBe(assetId);
  });

  it("test_full_happy_path_and_resolve_sets_resolved_at", async () => {
    const raised = await request(app)
      .post("/api/v1/maintenance-requests")
      .set(authHeaders(employeeId, Role.employee))
      .send({ asset_id: assetId, issue_description: "Fan noise" });
    expect(raised.status).toBe(201);
    const id = raised.body.id as number;

    const approve = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/approve`)
      .set(authHeaders(managerId, Role.asset_manager));
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe(MaintStatus.approved);
    expect(approve.body.approved_by).toBe(managerId);

    const assign = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/assign`)
      .set(authHeaders(managerId, Role.asset_manager))
      .send({ technician_name: "Alex Tech" });
    expect(assign.status).toBe(200);
    expect(assign.body.status).toBe(MaintStatus.technician_assigned);

    const start = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/start`)
      .set(authHeaders(managerId, Role.asset_manager));
    expect(start.status).toBe(200);
    expect(start.body.status).toBe(MaintStatus.in_progress);

    const resolve = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/resolve`)
      .set(authHeaders(managerId, Role.asset_manager));
    expect(resolve.status).toBe(200);
    expect(resolve.body.status).toBe(MaintStatus.resolved);
    expect(resolve.body.resolved_at).toBeTruthy();
  });

  it("test_illegal_jump_returns_422", async () => {
    const raised = await request(app)
      .post("/api/v1/maintenance-requests")
      .set(authHeaders(employeeId, Role.employee))
      .send({ asset_id: assetId, issue_description: "Skip states" });
    const id = raised.body.id as number;

    const res = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/start`)
      .set(authHeaders(managerId, Role.asset_manager));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE");
  });

  it("test_reject_path_from_pending", async () => {
    const raised = await request(app)
      .post("/api/v1/maintenance-requests")
      .set(authHeaders(employeeId, Role.employee))
      .send({ asset_id: assetId, issue_description: "Reject me" });
    const id = raised.body.id as number;

    const reject = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/reject`)
      .set(authHeaders(managerId, Role.asset_manager))
      .send({ reason: "not a defect" });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe(MaintStatus.rejected);
    expect(reject.body.approved_by).toBeNull();

    const reopen = await request(app)
      .post(`/api/v1/maintenance-requests/${id}/approve`)
      .set(authHeaders(managerId, Role.asset_manager));
    expect(reopen.status).toBe(422);
  });

  it("test_employee_cannot_approve_403", async () => {
    const raised = await request(app)
      .post("/api/v1/maintenance-requests")
      .set(authHeaders(employeeId, Role.employee))
      .send({ asset_id: assetId, issue_description: "No employee approve" });
    const res = await request(app)
      .post(`/api/v1/maintenance-requests/${raised.body.id}/approve`)
      .set(authHeaders(employeeId, Role.employee));
    expect(res.status).toBe(403);
  });

  // Keep categoryId referenced so TS doesn't complain if unused in future cleanups
  it("test_fixture_category_exists", () => {
    expect(categoryId).toBeGreaterThan(0);
  });
});
