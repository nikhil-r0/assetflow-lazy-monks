import { z } from "zod";
import { FieldType } from "@prisma/client";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

export const createCustomFieldSchema = z.object({
  field_name: z.string().min(1, "Field name is required").max(80),
  field_type: z.nativeEnum(FieldType),
});
