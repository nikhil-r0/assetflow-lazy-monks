import { NotImplementedError } from "../../shared/errors.js";
import type { CreateBookingInput } from "./booking.schema.js";

/**
 * Track C BookingService — Phase 0 stubs; Phase 1 fills create/list + overlap.
 */
export const bookingService = {
  async create(_input: CreateBookingInput, _actorId: number): Promise<never> {
    throw new NotImplementedError("bookingService.create");
  },

  async list(_filters: Record<string, unknown>): Promise<never> {
    throw new NotImplementedError("bookingService.list");
  },
};
