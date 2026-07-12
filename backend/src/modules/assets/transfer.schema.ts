import { z } from "zod";
import { TransferStatus } from "../../shared/enums.js";

export const createTransferSchema = z.object({
  asset_id: z.number().int().positive(),
  to_user_id: z.number().int().positive(),
});

export const rejectTransferSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listTransfersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(TransferStatus).optional(),
  asset_id: z.coerce.number().int().positive().optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
