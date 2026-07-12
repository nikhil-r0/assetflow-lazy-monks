import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { BookingStatus } from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { lockAssetForUpdate } from "./booking.service.js";
import {
  assertValidBookingRange,
  findOverlappingBooking,
  intervalsOverlap,
} from "./overlap.js";

function t(h: number, m = 0) {
  return new Date(Date.UTC(2026, 6, 12, h, m, 0));
}

describe("operations module mounts", () => {
  it("test_operations_module_mounts", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/operations/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: "operations" });
  });
});

describe("booking overlap (half-open intervals)", () => {
  const existing9to10 = [
    {
      id: 1,
      start: t(9),
      end: t(10),
      status: BookingStatus.upcoming,
    },
  ];

  it("test_reject_overlapping_booking_same_start", () => {
    const clash = findOverlappingBooking(t(9), t(10), existing9to10);
    expect(clash?.id).toBe(1);
    expect(intervalsOverlap(t(9), t(10), t(9), t(10))).toBe(true);
  });

  it("test_reject_partial_overlap_9_30_when_9_to_10_exists", () => {
    const clash = findOverlappingBooking(t(9, 30), t(10, 30), existing9to10);
    expect(clash?.id).toBe(1);
  });

  it("test_allow_booking_starting_at_existing_end_time", () => {
    const clash = findOverlappingBooking(t(10), t(11), existing9to10);
    expect(clash).toBeNull();
    expect(intervalsOverlap(t(10), t(11), t(9), t(10))).toBe(false);
  });

  it("test_allow_booking_ending_at_existing_start_time", () => {
    const clash = findOverlappingBooking(t(8), t(9), existing9to10);
    expect(clash).toBeNull();
  });

  it("test_reject_end_before_start_422", () => {
    expect(() => assertValidBookingRange(t(10), t(9))).toThrow(AppError);
    try {
      assertValidBookingRange(t(10), t(9));
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).httpStatus).toBe(422);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("test_cancelled_booking_does_not_block_overlap", () => {
    const cancelled = [
      {
        id: 2,
        start: t(9),
        end: t(10),
        status: BookingStatus.cancelled,
      },
    ];
    const clash = findOverlappingBooking(t(9, 30), t(10, 30), cancelled);
    expect(clash).toBeNull();
  });

  it("test_completed_booking_does_not_block_overlap", () => {
    const completed = [
      {
        id: 3,
        start: t(9),
        end: t(10),
        status: BookingStatus.completed,
      },
    ];
    expect(findOverlappingBooking(t(9), t(10), completed)).toBeNull();
  });
});

describe("booking create race lock", () => {
  it("test_lock_asset_for_update_issues_for_update_sql", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ id: 7, is_bookable: true }]);
    const row = await lockAssetForUpdate({ $queryRaw: queryRaw }, 7);
    expect(row).toEqual({ id: 7, is_bookable: true });
    expect(queryRaw).toHaveBeenCalledOnce();
    const strings = queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    expect(strings.join(" ")).toMatch(/FOR UPDATE/i);
  });

  it("test_lock_asset_for_update_missing_asset_404", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    await expect(
      lockAssetForUpdate({ $queryRaw: queryRaw }, 99),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("test_reject_booking_non_bookable_asset_422_shape", () => {
    const err = new AppError("UNPROCESSABLE", 422, "Asset is not bookable", [
      { field: "resource_asset_id", issue: "not_bookable" },
    ]);
    expect(err.httpStatus).toBe(422);
    expect(err.details?.[0]?.issue).toBe("not_bookable");
  });
});
