import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import {
  canTransition,
  TransitionError,
  transitionStatusPure,
} from "./assetStatus.js";
import { AssetStatus } from "../../shared/enums.js";
import { buildAlreadyAllocatedConflict } from "./conflict.js";

const managerHeaders = {
  "x-user-id": "1",
  "x-user-role": "asset_manager",
};

const employeeHeaders = {
  "x-user-id": "2",
  "x-user-role": "employee",
};

describe("assets module mounts", () => {
  it("test_assets_module_mounts_ping", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/assets/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: "assets" });
  });
});

describe("assets RBAC gates", () => {
  it("test_create_asset_requires_auth", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/assets").send({ name: "X", category_id: 1 });
    expect(res.status).toBe(401);
  });

  it("test_create_asset_employee_forbidden", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/assets")
      .set(employeeHeaders)
      .send({ name: "X", category_id: 1 });
    expect(res.status).toBe(403);
  });

  it("test_allocate_requires_manager_role", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/allocations")
      .set(employeeHeaders)
      .send({ asset_id: 1, employee_id: 2 });
    expect(res.status).toBe(403);
  });

  it("test_patch_rejects_status_field", async () => {
    const app = createApp();
    const res = await request(app)
      .patch("/api/v1/assets/1")
      .set(managerHeaders)
      .send({ status: "Lost" });
    expect(res.status).toBe(422);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("asset status state machine", () => {
  it("test_transition_available_to_allocated_ok", () => {
    expect(canTransition(AssetStatus.Available, AssetStatus.Allocated)).toBe(true);
    expect(
      transitionStatusPure(AssetStatus.Available, AssetStatus.Allocated),
    ).toBe(AssetStatus.Allocated);
  });

  it("test_transition_disposed_to_anything_rejected", () => {
    expect(canTransition(AssetStatus.Disposed, AssetStatus.Available)).toBe(false);
    expect(() =>
      transitionStatusPure(AssetStatus.Disposed, AssetStatus.Available),
    ).toThrow(TransitionError);
  });

  it("test_transition_retired_to_available_rejected", () => {
    expect(canTransition(AssetStatus.Retired, AssetStatus.Available)).toBe(false);
  });

  it("test_illegal_transition_returns_unprocessable_code", () => {
    try {
      transitionStatusPure(AssetStatus.Available, AssetStatus.Available);
      expect.unreachable("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TransitionError);
      expect((err as TransitionError).code).toBe("UNPROCESSABLE");
    }
  });
});

describe("allocation conflict payload", () => {
  it("test_409_body_includes_current_holder_name", () => {
    const body = buildAlreadyAllocatedConflict({
      holderUserId: 7,
      holderName: "Priya",
      assetTag: "AF-0114",
    });
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toContain("Priya");
    expect(body.error.details?.[0]).toMatchObject({
      field: "asset_id",
      issue: "already_allocated",
      holder_user_id: 7,
      holder_name: "Priya",
    });
  });
});
