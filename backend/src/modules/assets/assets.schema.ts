import { z } from "zod";

/** Placeholders — filled in Track B Phase 1+. */
export const createAssetSchema = z.object({
  name: z.string().min(1).max(160),
  category_id: z.number().int().positive(),
  serial_number: z.string().max(120).optional(),
  acquisition_date: z.string().optional(),
  acquisition_cost: z.number().nonnegative().optional(),
  condition: z.string().max(60).optional(),
  location: z.string().max(160).optional(),
  is_bookable: z.boolean().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
  documents: z
    .array(
      z.object({
        file_url: z.string().url().or(z.string().min(1)),
        doc_type: z.string().max(60).optional(),
      }),
    )
    .optional(),
});

export const allocateAssetSchema = z
  .object({
    asset_id: z.number().int().positive(),
    employee_id: z.number().int().positive().optional(),
    department_id: z.number().int().positive().optional(),
    expected_return_date: z.string().optional(),
    condition_notes_out: z.string().max(500).optional(),
  })
  .refine(
    (b) =>
      (b.employee_id != null && b.department_id == null) ||
      (b.employee_id == null && b.department_id != null),
    { message: "Exactly one of employee_id or department_id is required" },
  );

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>;
