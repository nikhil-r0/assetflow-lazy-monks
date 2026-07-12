import { describe, expect, it } from "vitest";
import { isOverdueReturn } from "./overdue.js";

describe("overdue return flagging", () => {
  const today = new Date("2026-07-12T12:00:00.000Z");

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
});
