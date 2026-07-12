import { z } from "zod";

export const createBookingSchema = z.object({
  resource_asset_id: z.number().int().positive(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  department_id: z.number().int().positive().optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const listBookingsQuerySchema = z.object({
  resource_asset_id: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  booked_by_user_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
