import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllocStatus } from "../../shared/enums.js";
import { createNotification } from "../../shared/notify.js";
import { logActivity } from "../../shared/activity.js";
import { prisma } from "../../shared/prisma.js";
import { flagOverdueAllocations, isOverdueReturn, startOfUtcDay } from "./overdue.js";

vi.mock("../../shared/prisma.js", () => ({
  prisma: {
    allocations: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../shared/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../shared/notify.js", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("overdue return flagging", () => {
  const today = new Date("2026-07-12T12:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_allocation_past_expected_return_flagged_overdue", () => {
    expect(isOverdueReturn("2026-07-11", today)).toBe(true);
  });

  it("test_allocation_due_today_not_yet_overdue", () => {
    expect(isOverdueReturn("2026-07-12", today)).toBe(false);
  });

  it("test_no_expected_return_date_never_overdue", () => {
    expect(isOverdueReturn(null, today)).toBe(false);
    expect(isOverdueReturn(undefined, today)).toBe(false);
  });

  it("startOfUtcDay is midnight UTC", () => {
    expect(startOfUtcDay(today).toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("flagOverdueAllocations flips past-due active rows and notifies", async () => {
    vi.mocked(prisma.allocations.findMany).mockResolvedValue([
      {
        id: 10,
        asset_id: 1,
        employee_id: 5,
        status: AllocStatus.active,
        expected_return_date: new Date("2026-07-10T00:00:00.000Z"),
        asset: { asset_tag: "AF-0001" },
        employee: { id: 5, name: "Priya" },
      },
      {
        id: 11,
        asset_id: 2,
        employee_id: 6,
        status: AllocStatus.active,
        expected_return_date: new Date("2026-07-12T00:00:00.000Z"),
        asset: { asset_tag: "AF-0002" },
        employee: { id: 6, name: "Raj" },
      },
    ] as never);
    vi.mocked(prisma.allocations.updateMany).mockResolvedValue({ count: 1 } as never);

    const result = await flagOverdueAllocations(99, today);

    expect(result).toEqual({ flagged: 1, allocation_ids: [10] });
    expect(prisma.allocations.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] }, status: AllocStatus.active },
      data: { status: AllocStatus.overdue },
    });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      5,
      "OVERDUE_RETURN",
      expect.stringContaining("AF-0001"),
      "allocation",
      10,
    );
    expect(logActivity).toHaveBeenCalledWith(
      99,
      "FLAG_OVERDUE",
      "allocation",
      undefined,
      { flagged: 1, allocation_ids: [10] },
    );
  });

  it("flagOverdueAllocations is idempotent when nothing is due", async () => {
    vi.mocked(prisma.allocations.findMany).mockResolvedValue([]);
    const result = await flagOverdueAllocations(1, today);
    expect(result).toEqual({ flagged: 0, allocation_ids: [] });
    expect(prisma.allocations.updateMany).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
