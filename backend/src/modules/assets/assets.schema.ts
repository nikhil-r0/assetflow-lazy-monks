import { z } from "zod";
import { AssetStatus } from "../../shared/enums.js";

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
        file_url: z.string().min(1).max(500),
        doc_type: z.string().max(60).optional(),
      }),
    )
    .optional(),
});

export const updateAssetSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    category_id: z.number().int().positive().optional(),
    serial_number: z.string().max(120).nullable().optional(),
    acquisition_date: z.string().nullable().optional(),
    acquisition_cost: z.number().nonnegative().nullable().optional(),
    condition: z.string().max(60).nullable().optional(),
    location: z.string().max(160).nullable().optional(),
    is_bookable: z.boolean().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict()
  .refine((b) => !("status" in b), {
    message: "status cannot be set via PATCH /assets — use status transition endpoint",
  });

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  location: z.string().optional(),
  is_bookable: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === "true")),
});

export const transitionStatusSchema = z.object({
  status: z.nativeEnum(AssetStatus),
  reason: z.string().max(500).optional(),
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

export const returnAllocationSchema = z.object({
  condition_notes_in: z.string().max(500).optional(),
  actual_return_date: z.string().optional(),
});

export const addDocumentSchema = z.object({
  file_url: z.string().min(1).max(500),
  doc_type: z.string().max(60).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>;
export type ReturnAllocationInput = z.infer<typeof returnAllocationSchema>;
