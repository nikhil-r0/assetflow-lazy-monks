import { ACT, BookingStatus, NOTIF } from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import type { CreateBookingInput, ListBookingsQuery } from "./booking.schema.js";
import {
  assertValidBookingRange,
  findOverlappingBooking,
  overlapError,
} from "./overlap.js";

export const bookingService = {
  async create(input: CreateBookingInput, actorId: number) {
    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    assertValidBookingRange(start, end);

    const asset = await prisma.assets.findUnique({
      where: { id: input.resource_asset_id },
    });
    if (!asset) {
      throw new NotFoundError("Asset not found");
    }
    if (!asset.is_bookable) {
      throw new AppError("UNPROCESSABLE", 422, "Asset is not bookable", [
        { field: "resource_asset_id", issue: "not_bookable" },
      ]);
    }

    return prisma.$transaction(async (tx) => {
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

      const booking = await tx.bookings.create({
        data: {
          resource_asset_id: input.resource_asset_id,
          booked_by_user_id: actorId,
          department_id: input.department_id ?? null,
          start_time: start,
          end_time: end,
          status: BookingStatus.upcoming,
        },
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
    });
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
};
