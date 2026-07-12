import { z } from "zod";
import { Priority } from "../../shared/enums.js";

export const raiseMaintenanceSchema = z.object({
  asset_id: z.number().int().positive(),
  issue_description: z.string().min(1).max(1000),
  priority: z.nativeEnum(Priority).optional(),
  photo_url: z.string().max(500).optional().nullable(),
});

export const assignTechnicianSchema = z.object({
  technician_name: z.string().min(1).max(120),
});

export const rejectMaintenanceSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listMaintQuerySchema = z.object({
  status: z.string().optional(),
  asset_id: z.coerce.number().int().positive().optional(),
  priority: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type RaiseMaintenanceInput = z.infer<typeof raiseMaintenanceSchema>;
export type ListMaintQuery = z.infer<typeof listMaintQuerySchema>;
