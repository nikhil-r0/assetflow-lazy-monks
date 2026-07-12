import { BookingStatus } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";

export type BookingInterval = {
  id?: number;
  start: Date;
  end: Date;
  status: BookingStatus | string;
};

/**
 * Half-open interval overlap: [newStart, newEnd) conflicts with [exStart, exEnd)
 * iff newStart < exEnd AND newEnd > exStart.
 * Adjacent bookings (touching at an endpoint) do NOT conflict.
 */
export function intervalsOverlap(
  newStart: Date,
  newEnd: Date,
  exStart: Date,
  exEnd: Date,
): boolean {
  return newStart < exEnd && newEnd > exStart;
}

/** Statuses that still occupy the calendar slot. */
export function occupiesSlot(status: string): boolean {
  return status === BookingStatus.upcoming || status === BookingStatus.ongoing;
}

/**
 * Find first conflicting booking among existing (ignores cancelled/completed).
 * Optionally exclude a booking id (reschedule self-check).
 */
export function findOverlappingBooking(
  newStart: Date,
  newEnd: Date,
  existing: BookingInterval[],
  excludeId?: number,
): BookingInterval | null {
  for (const b of existing) {
    if (excludeId != null && b.id === excludeId) continue;
    if (!occupiesSlot(String(b.status))) continue;
    if (intervalsOverlap(newStart, newEnd, b.start, b.end)) {
      return b;
    }
  }
  return null;
}

export function assertValidBookingRange(start: Date, end: Date): void {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid start_time", [
      { field: "start_time", issue: "invalid" },
    ]);
  }
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid end_time", [
      { field: "end_time", issue: "invalid" },
    ]);
  }
  if (end <= start) {
    throw new AppError("VALIDATION_ERROR", 422, "end_time must be after start_time", [
      { field: "end_time", issue: "must_be_after_start" },
    ]);
  }
}

export function overlapError(conflictingBookingId: number | undefined): AppError {
  return new AppError(
    "OVERLAP",
    422,
    "Time slot overlaps an existing booking",
    [
      {
        field: "time",
        issue: "overlap",
        conflicting_booking_id: conflictingBookingId ?? null,
      },
    ],
  );
}
