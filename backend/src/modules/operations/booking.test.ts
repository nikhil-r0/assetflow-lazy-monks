import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { BookingStatus, Role } from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { prisma } from "../../shared/prisma.js";
import { bookingService, lockAssetForUpdate } from "./booking.service.js";
import { deriveBookingStatus, nextAutoBookingStatus } from "./bookingStatus.js";
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

describe("booking status lifecycle (pure)", () => {
  const start = t(10);
  const end = t(11);

  it("test_upcoming_becomes_ongoing_at_start", () => {
    expect(deriveBookingStatus(t(10), start, end, BookingStatus.upcoming)).toBe(
      BookingStatus.ongoing,
    );
    expect(nextAutoBookingStatus(t(10), start, end, BookingStatus.upcoming)).toBe(
      BookingStatus.ongoing,
    );
  });

  it("test_ongoing_becomes_completed_after_end", () => {
    expect(deriveBookingStatus(t(11), start, end, BookingStatus.ongoing)).toBe(
      BookingStatus.completed,
    );
    expect(nextAutoBookingStatus(t(11), start, end, BookingStatus.ongoing)).toBe(
      BookingStatus.completed,
    );
  });

  it("test_cancelled_not_auto_transitioned", () => {
    expect(nextAutoBookingStatus(t(12), start, end, BookingStatus.cancelled)).toBeNull();
    expect(deriveBookingStatus(t(12), start, end, BookingStatus.cancelled)).toBe(
      BookingStatus.cancelled,
    );
  });

  it("test_refresh_status_idempotent", () => {
    expect(nextAutoBookingStatus(t(9), start, end, BookingStatus.upcoming)).toBeNull();
    expect(nextAutoBookingStatus(t(10, 30), start, end, BookingStatus.ongoing)).toBeNull();
  });
});

describe("booking calendar / cancel / reschedule / reminders API", () => {
  let userId: number;
  let managerId: number;
  let assetId: number;
  let otherAssetId: number;

  beforeAll(async () => {
    const suffix = Date.now();
    const user = await prisma.users.create({
      data: {
        name: "Book User",
        email: `book-user-${suffix}@test.local`,
        password_hash: "x",
        role: Role.employee,
      },
    });
    const manager = await prisma.users.create({
      data: {
        name: "Book Mgr",
        email: `book-mgr-${suffix}@test.local`,
        password_hash: "x",
        role: Role.asset_manager,
      },
    });
    const category = await prisma.asset_categories.create({
      data: { name: `BookCat-${suffix}` },
    });
    const asset = await prisma.assets.create({
      data: {
        asset_tag: `AF-B${suffix % 10000}`,
        name: "Bookable Room",
        category_id: category.id,
        status: "Available",
        is_bookable: true,
      },
    });
    const other = await prisma.assets.create({
      data: {
        asset_tag: `AF-O${suffix % 10000}`,
        name: "Other Room",
        category_id: category.id,
        status: "Available",
        is_bookable: true,
      },
    });
    userId = user.id;
    managerId = manager.id;
    assetId = asset.id;
    otherAssetId = other.id;
  });

  function auth(userId: number, role: Role) {
    return { "x-user-id": String(userId), "x-user-role": role };
  }

  it("test_calendar_returns_only_range_and_resource", async () => {
    const app = createApp();
    const a = await request(app)
      .post("/api/v1/bookings")
      .set(auth(userId, Role.employee))
      .send({
        resource_asset_id: assetId,
        start_time: t(14).toISOString(),
        end_time: t(15).toISOString(),
      });
    expect(a.status).toBe(201);

    await request(app)
      .post("/api/v1/bookings")
      .set(auth(userId, Role.employee))
      .send({
        resource_asset_id: otherAssetId,
        start_time: t(14).toISOString(),
        end_time: t(15).toISOString(),
      });

    const cal = await request(app)
      .get("/api/v1/bookings/calendar")
      .query({
        resource_asset_id: assetId,
        from: t(13).toISOString(),
        to: t(16).toISOString(),
      })
      .set(auth(userId, Role.employee));
    expect(cal.status).toBe(200);
    expect(Array.isArray(cal.body)).toBe(true);
    expect(cal.body.every((b: { resource_asset_id: number }) => b.resource_asset_id === assetId)).toBe(
      true,
    );
    expect(cal.body.some((b: { id: number }) => b.id === a.body.id)).toBe(true);
  });

  it("test_refresh_status_api_transitions", async () => {
    const past = await prisma.bookings.create({
      data: {
        resource_asset_id: assetId,
        booked_by_user_id: userId,
        start_time: t(1),
        end_time: t(2),
        status: BookingStatus.upcoming,
      },
    });
    const current = await prisma.bookings.create({
      data: {
        resource_asset_id: assetId,
        booked_by_user_id: userId,
        start_time: new Date(Date.now() - 5 * 60_000),
        end_time: new Date(Date.now() + 30 * 60_000),
        status: BookingStatus.upcoming,
      },
    });

    const app = createApp();
    const res = await request(app)
      .post("/api/v1/bookings/refresh-status")
      .set(auth(managerId, Role.asset_manager));
    expect(res.status).toBe(200);
    expect(res.body.updated).toBeGreaterThanOrEqual(2);

    const pastRow = await prisma.bookings.findUniqueOrThrow({ where: { id: past.id } });
    const curRow = await prisma.bookings.findUniqueOrThrow({ where: { id: current.id } });
    expect(pastRow.status).toBe(BookingStatus.completed);
    expect(curRow.status).toBe(BookingStatus.ongoing);
  });

  it("test_cancel_upcoming_booking_ok", async () => {
    const app = createApp();
    const created = await request(app)
      .post("/api/v1/bookings")
      .set(auth(userId, Role.employee))
      .send({
        resource_asset_id: assetId,
        start_time: t(16).toISOString(),
        end_time: t(17).toISOString(),
      });
    const cancel = await request(app)
      .post(`/api/v1/bookings/${created.body.id}/cancel`)
      .set(auth(userId, Role.employee));
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe(BookingStatus.cancelled);
  });

  it("test_cancel_completed_booking_422", async () => {
    const row = await prisma.bookings.create({
      data: {
        resource_asset_id: assetId,
        booked_by_user_id: userId,
        start_time: t(3),
        end_time: t(4),
        status: BookingStatus.completed,
      },
    });
    const app = createApp();
    const res = await request(app)
      .post(`/api/v1/bookings/${row.id}/cancel`)
      .set(auth(userId, Role.employee));
    expect(res.status).toBe(422);
  });

  it("test_reschedule_excludes_self_and_conflict", async () => {
    const app = createApp();
    const first = await request(app)
      .post("/api/v1/bookings")
      .set(auth(userId, Role.employee))
      .send({
        resource_asset_id: assetId,
        start_time: t(18).toISOString(),
        end_time: t(19).toISOString(),
      });
    const second = await request(app)
      .post("/api/v1/bookings")
      .set(auth(userId, Role.employee))
      .send({
        resource_asset_id: assetId,
        start_time: t(19).toISOString(),
        end_time: t(20).toISOString(),
      });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const clash = await request(app)
      .patch(`/api/v1/bookings/${second.body.id}/reschedule`)
      .set(auth(userId, Role.employee))
      .send({
        start_time: t(18, 30).toISOString(),
        end_time: t(19, 30).toISOString(),
      });
    expect(clash.status).toBe(422);
    expect(clash.body.error.code).toBe("OVERLAP");

    const ok = await request(app)
      .patch(`/api/v1/bookings/${second.body.id}/reschedule`)
      .set(auth(userId, Role.employee))
      .send({
        start_time: t(20).toISOString(),
        end_time: t(21).toISOString(),
      });
    expect(ok.status).toBe(200);
    expect(new Date(ok.body.start_time).toISOString()).toBe(t(20).toISOString());
  });

  it("test_reschedule_non_upcoming_422", async () => {
    const row = await prisma.bookings.create({
      data: {
        resource_asset_id: assetId,
        booked_by_user_id: userId,
        start_time: t(5),
        end_time: t(6),
        status: BookingStatus.ongoing,
      },
    });
    const app = createApp();
    const res = await request(app)
      .patch(`/api/v1/bookings/${row.id}/reschedule`)
      .set(auth(userId, Role.employee))
      .send({
        start_time: t(22).toISOString(),
        end_time: t(23).toISOString(),
      });
    expect(res.status).toBe(422);
  });

  it("test_reminder_sent_once_only", async () => {
    const soonStart = new Date(Date.now() + 5 * 60_000);
    const soonEnd = new Date(Date.now() + 65 * 60_000);
    const row = await prisma.bookings.create({
      data: {
        resource_asset_id: assetId,
        booked_by_user_id: userId,
        start_time: soonStart,
        end_time: soonEnd,
        status: BookingStatus.upcoming,
        reminder_sent: false,
      },
    });

    const first = await bookingService.emitReminders();
    expect(first.reminded).toBeGreaterThanOrEqual(1);
    const mid = await prisma.bookings.findUniqueOrThrow({ where: { id: row.id } });
    expect(mid.reminder_sent).toBe(true);

    const second = await bookingService.emitReminders();
    expect(second.reminded).toBe(0);
  });
});
