import { FieldType } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";

export type CustomFieldDef = {
  field_name: string;
  field_type: FieldType;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertType(
  fieldName: string,
  fieldType: FieldType,
  value: unknown,
): unknown {
  switch (fieldType) {
    case FieldType.text:
      if (typeof value !== "string") {
        throw fieldTypeError(fieldName, "string");
      }
      return value;
    case FieldType.number: {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
      }
      throw fieldTypeError(fieldName, "number");
    }
    case FieldType.boolean:
      if (typeof value !== "boolean") {
        throw fieldTypeError(fieldName, "boolean");
      }
      return value;
    case FieldType.date:
      if (typeof value !== "string" || !ISO_DATE.test(value)) {
        throw fieldTypeError(fieldName, "date (YYYY-MM-DD)");
      }
      return value;
    default:
      throw fieldTypeError(fieldName, "supported type");
  }
}

function fieldTypeError(fieldName: string, expected: string): AppError {
  return new AppError("VALIDATION_ERROR", 422, `Invalid type for custom field '${fieldName}'`, [
    { field: fieldName, issue: "wrong_type", expected },
  ]);
}

/**
 * Validates `custom_fields` against category definitions (BUILD_SPEC Track B Phase 1).
 * Unknown keys → 422. Wrong types → 422. Missing keys are allowed (optional).
 */
export function validateCustomFields(
  defs: CustomFieldDef[],
  values: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (values == null) return {};
  const byName = new Map(defs.map((d) => [d.field_name, d]));
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(values)) {
    const def = byName.get(key);
    if (!def) {
      throw new AppError(
        "VALIDATION_ERROR",
        422,
        `Unknown custom field '${key}'`,
        [{ field: key, issue: "unknown_custom_field" }],
      );
    }
    out[key] = assertType(key, def.field_type, raw);
  }

  return out;
}
