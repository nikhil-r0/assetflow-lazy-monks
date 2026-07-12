import { BookingStatus } from "../../shared/enums.js";

/**
 * Time-derived booking status (BUILD_SPEC C-Phase 3).
 * `cancelled` is sticky and never auto-changed.
 */
export function deriveBookingStatus(
  now: Date,
  start: Date,
  end: Date,
  current: BookingStatus | string,
): BookingStatus {
  if (current === BookingStatus.cancelled) {
    return BookingStatus.cancelled;
  }
  if (now < start) return BookingStatus.upcoming;
  if (now < end) return BookingStatus.ongoing;
  return BookingStatus.completed;
}

/** Next auto status, or null if no change needed. */
export function nextAutoBookingStatus(
  now: Date,
  start: Date,
  end: Date,
  current: BookingStatus | string,
): BookingStatus | null {
  if (current === BookingStatus.cancelled) return null;
  const desired = deriveBookingStatus(now, start, end, current);
  return desired === current ? null : desired;
}
