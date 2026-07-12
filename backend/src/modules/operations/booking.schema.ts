import { z } from "zod";

/** Placeholders — filled in Track C Phase 1+. */
export const createBookingSchema = z.object({
  resource_asset_id: z.number().int().positive(),
  start_time: z.string().datetime({ offset: true }).or(z.string().min(1)),
  end_time: z.string().datetime({ offset: true }).or(z.string().min(1)),
  department_id: z.number().int().positive().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
