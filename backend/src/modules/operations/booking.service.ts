import { ACT, BookingStatus, NOTIF, Role } from "../../shared/enums.js";
import { ForbiddenError } from "../../shared/auth.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import type {
  CalendarQuery,
  CreateBookingInput,
  ListBookingsQuery,
  RescheduleBookingInput,
} from "./booking.schema.js";
import { nextAutoBookingStatus } from "./bookingStatus.js";
import {
  assertValidBookingRange,
  findOverlappingBooking,
  overlapError,
} from "./overlap.js";

type Actor = { id: number; role: Role };

/**
 * Lock the asset row so concurrent booking creates cannot both pass the overlap
 * check. Locking bookings alone is insufficient when no rows exist yet.
 */
export async function lockAssetForUpdate(
  tx: { $queryRaw: typeof prisma.$queryRaw },
  assetId: number,
): Promise<{ id: number; is_bookable: boolean }> {
  const rows = await tx.$queryRaw<Array<{ id: number; is_bookable: boolean }>>`
    SELECT id, is_bookable
    FROM assets
    WHERE id = ${assetId}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new NotFoundError("Asset not found");
  }
  return row;
}

function canManageBooking(actor: Actor, bookedByUserId: number): boolean {
  if (actor.id === bookedByUserId) return true;
  return actor.role === Role.admin || actor.role === Role.asset_manager;
}

export const bookingService = {
  async create(input: CreateBookingInput, actorId: number) {
    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    assertValidBookingRange(start, end);

    const booking = await prisma.$transaction(async (tx) => {
      const asset = await lockAssetForUpdate(tx, input.resource_asset_id);
      if (!asset.is_bookable) {
        throw new AppError("UNPROCESSABLE", 422, "Asset is not bookable", [
          { field: "resource_asset_id", issue: "not_bookable" },
        ]);
      }

      const existing = await tx.bookings.findMany({
        where: {
          resource_asset_id: input.resource_asset_id,
          status: { in: [BookingStatus.upcoming, BookingStatus.ongoing] },
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });

      const clash = findOverlappingBooking(
        start,
        end,
        existing.map((b) => ({
          id: b.id,
          start: b.start_time,
          end: b.end_time,
          status: b.status,
        })),
      );
      if (clash) {
        throw overlapError(clash.id);
      }

      return tx.bookings.create({
        data: {
          resource_asset_id: input.resource_asset_id,
          booked_by_user_id: actorId,
          department_id: input.department_id ?? null,
          start_time: start,
          end_time: end,
          status: BookingStatus.upcoming,
        },
      });
    });

    await createNotification(
      actorId,
      NOTIF.BOOKING_CONFIRMED,
      `Booking confirmed for asset #${input.resource_asset_id}`,
      "booking",
      booking.id,
    );
    await logActivity(actorId, ACT.CREATE_BOOKING, "booking", booking.id, {
      resource_asset_id: input.resource_asset_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });

    return booking;
  },

  async list(query: ListBookingsQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {};

    if (query.resource_asset_id != null) {
      where.resource_asset_id = query.resource_asset_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.booked_by_user_id != null) {
      where.booked_by_user_id = query.booked_by_user_id;
    }
    if (query.from || query.to) {
      where.start_time = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, data] = await Promise.all([
      prisma.bookings.count({ where }),
      prisma.bookings.findMany({
        where,
        orderBy: { start_time: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },

  /** Phase 3 — range-bounded calendar feed (no pagination). */
  async calendar(query: CalendarQuery) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    assertValidBookingRange(from, to);

    return prisma.bookings.findMany({
      where: {
        resource_asset_id: query.resource_asset_id,
        start_time: { lt: to },
        end_time: { gt: from },
      },
      orderBy: { start_time: "asc" },
    });
  },

  /**
   * Phase 3 — apply time-derived status transitions.
   * Idempotent; skips cancelled. Callable from route + boot interval.
   */
  async refreshStatus(now = new Date()) {
    const candidates = await prisma.bookings.findMany({
      where: {
        status: { in: [BookingStatus.upcoming, BookingStatus.ongoing] },
      },
    });

    let updated = 0;
    for (const row of candidates) {
      const next = nextAutoBookingStatus(now, row.start_time, row.end_time, row.status);
      if (!next) continue;
      const result = await prisma.bookings.updateMany({
        where: { id: row.id, status: row.status },
        data: { status: next },
      });
      updated += result.count;
    }
    return { updated };
  },

  async cancel(id: number, actor: Actor) {
    const row = await prisma.bookings.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Booking not found");
    if (!canManageBooking(actor, row.booked_by_user_id)) {
      throw new ForbiddenError("Not allowed to cancel this booking");
    }
    if (
      row.status === BookingStatus.completed ||
      row.status === BookingStatus.cancelled
    ) {
      throw new AppError("UNPROCESSABLE", 422, "Booking cannot be cancelled", [
        { field: "status", issue: "illegal_transition", from: row.status },
      ]);
    }

    const result = await prisma.bookings.updateMany({
      where: {
        id,
        status: { in: [BookingStatus.upcoming, BookingStatus.ongoing] },
      },
      data: { status: BookingStatus.cancelled },
    });
    if (result.count === 0) {
      throw new AppError("UNPROCESSABLE", 422, "Booking cannot be cancelled", [
        { field: "status", issue: "illegal_transition" },
      ]);
    }
    const updated = await prisma.bookings.findUniqueOrThrow({ where: { id } });

    await createNotification(
      row.booked_by_user_id,
      NOTIF.BOOKING_CANCELLED,
      `Booking #${id} cancelled`,
      "booking",
      id,
    );
    await logActivity(actor.id, ACT.CANCEL_BOOKING, "booking", id);
    return updated;
  },

  async reschedule(id: number, input: RescheduleBookingInput, actor: Actor) {
    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    assertValidBookingRange(start, end);

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.bookings.findUnique({ where: { id } });
      if (!row) throw new NotFoundError("Booking not found");
      if (!canManageBooking(actor, row.booked_by_user_id)) {
        throw new ForbiddenError("Not allowed to reschedule this booking");
      }
      if (row.status !== BookingStatus.upcoming) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          "Only upcoming bookings can be rescheduled",
          [{ field: "status", issue: "must_be_upcoming", from: row.status }],
        );
      }

      await lockAssetForUpdate(tx, row.resource_asset_id);

      const existing = await tx.bookings.findMany({
        where: {
          resource_asset_id: row.resource_asset_id,
          status: { in: [BookingStatus.upcoming, BookingStatus.ongoing] },
          start_time: { lt: end },
          end_time: { gt: start },
        },
      });

      const clash = findOverlappingBooking(
        start,
        end,
        existing.map((b) => ({
          id: b.id,
          start: b.start_time,
          end: b.end_time,
          status: b.status,
        })),
        id,
      );
      if (clash) {
        throw overlapError(clash.id);
      }

      const result = await tx.bookings.updateMany({
        where: { id, status: BookingStatus.upcoming },
        data: {
          start_time: start,
          end_time: end,
          reminder_sent: false,
        },
      });
      if (result.count === 0) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          "Only upcoming bookings can be rescheduled",
          [{ field: "status", issue: "must_be_upcoming" }],
        );
      }
      return tx.bookings.findUniqueOrThrow({ where: { id } });
    });

    await logActivity(actor.id, ACT.CREATE_BOOKING, "booking", id, {
      action: "reschedule",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    return updated;
  },

  /**
   * Phase 5 — remind bookers of upcoming slots starting within 15 minutes.
   * Idempotent via `reminder_sent`.
   */
  async emitReminders(now = new Date()) {
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);
    const due = await prisma.bookings.findMany({
      where: {
        status: BookingStatus.upcoming,
        reminder_sent: false,
        start_time: { gt: now, lte: windowEnd },
      },
    });

    let reminded = 0;
    for (const row of due) {
      try {
        await prisma.notifications.create({
          data: {
            user_id: row.booked_by_user_id,
            type: NOTIF.BOOKING_REMINDER,
            message: `Reminder: booking #${row.id} starts soon`,
            related_entity_type: "booking",
            related_entity_id: row.id,
          },
        });
      } catch {
        continue;
      }
      const result = await prisma.bookings.updateMany({
        where: { id: row.id, reminder_sent: false },
        data: { reminder_sent: true },
      });
      if (result.count === 0) continue;
      reminded += 1;
    }
    return { reminded };
  },
};
