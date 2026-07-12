import { z } from "zod";
import { Priority } from "../../shared/enums.js";

/** Placeholders — filled in Track C Phase 2+. */
export const raiseMaintenanceSchema = z.object({
  asset_id: z.number().int().positive(),
  issue_description: z.string().min(1).max(1000),
  priority: z.nativeEnum(Priority).optional(),
  photo_url: z.string().max(500).optional(),
});

export const assignTechnicianSchema = z.object({
  technician_name: z.string().min(1).max(120),
});

export const rejectMaintenanceSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RaiseMaintenanceInput = z.infer<typeof raiseMaintenanceSchema>;
