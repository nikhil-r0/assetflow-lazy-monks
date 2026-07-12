import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

describe("operations module mounts", () => {
  it("test_operations_module_mounts", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/operations/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: "operations" });
  });
});
