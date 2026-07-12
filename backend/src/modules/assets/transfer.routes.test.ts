import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

const employeeHeaders = {
  "x-user-id": "2",
  "x-user-role": "employee",
};

const managerHeaders = {
  "x-user-id": "1",
  "x-user-role": "asset_manager",
};

describe("transfer-requests routes", () => {
  it("requires auth to create transfer", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/transfer-requests")
      .send({ asset_id: 1, to_user_id: 2 });
    expect(res.status).toBe(401);
  });

  it("employee cannot approve transfer", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/transfer-requests/1/approve")
      .set(employeeHeaders);
    expect(res.status).toBe(403);
  });

  it("rejects invalid create body", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/transfer-requests")
      .set(managerHeaders)
      .send({ asset_id: 1 });
    expect(res.status).toBe(422);
  });
});
