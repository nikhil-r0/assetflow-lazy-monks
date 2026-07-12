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

describe("assets module mounts", () => {
  it("test_assets_module_mounts_ping", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/assets/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: "assets" });
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
