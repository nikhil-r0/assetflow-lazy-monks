import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";

vi.mock("./overdue.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./overdue.js")>();
  return {
    ...actual,
    flagOverdueAllocations: vi.fn().mockResolvedValue({ flagged: 0, allocation_ids: [] }),
  };
});

import { flagOverdueAllocations } from "./overdue.js";

const employeeHeaders = {
  "x-user-id": "2",
  "x-user-role": "employee",
};

const managerHeaders = {
  "x-user-id": "1",
  "x-user-role": "asset_manager",
};

describe("POST /allocations/flag-overdue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(flagOverdueAllocations).mockResolvedValue({
      flagged: 0,
      allocation_ids: [],
    });
  });

  it("requires auth", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/allocations/flag-overdue");
    expect(res.status).toBe(401);
  });

  it("forbids employee", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/allocations/flag-overdue")
      .set(employeeHeaders);
    expect(res.status).toBe(403);
  });

  it("allows asset_manager and returns flagged payload", async () => {
    vi.mocked(flagOverdueAllocations).mockResolvedValue({
      flagged: 2,
      allocation_ids: [3, 4],
    });
    const app = createApp();
    const res = await request(app)
      .post("/api/v1/allocations/flag-overdue")
      .set(managerHeaders);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ flagged: 2, allocation_ids: [3, 4] });
    expect(flagOverdueAllocations).toHaveBeenCalledWith(1);
  });
});
