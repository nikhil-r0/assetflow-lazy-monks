import { describe, expect, it } from "vitest";
import { FieldType } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { validateCustomFields } from "./customFields.js";

const defs = [
  { field_name: "warranty_months", field_type: FieldType.number },
  { field_name: "notes", field_type: FieldType.text },
  { field_name: "insured", field_type: FieldType.boolean },
  { field_name: "purchase_date", field_type: FieldType.date },
];

describe("custom field validation", () => {
  it("test_custom_fields_accept_valid_values", () => {
    const result = validateCustomFields(defs, {
      warranty_months: 12,
      notes: "ok",
      insured: true,
      purchase_date: "2026-01-15",
    });
    expect(result).toEqual({
      warranty_months: 12,
      notes: "ok",
      insured: true,
      purchase_date: "2026-01-15",
    });
  });

  it("test_custom_field_unknown_key_rejected_422", () => {
    expect(() =>
      validateCustomFields(defs, { unknown_key: "x" }),
    ).toThrow(AppError);
    try {
      validateCustomFields(defs, { unknown_key: "x" });
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
      expect((err as AppError).httpStatus).toBe(422);
    }
  });

  it("test_custom_field_wrong_type_rejected_422", () => {
    expect(() =>
      validateCustomFields(defs, { warranty_months: "twelve" }),
    ).toThrow(AppError);
  });

  it("test_empty_custom_fields_ok_when_optional", () => {
    expect(validateCustomFields(defs, undefined)).toEqual({});
    expect(validateCustomFields(defs, {})).toEqual({});
  });

  it("test_numeric_string_coerced_for_number_fields", () => {
    expect(validateCustomFields(defs, { warranty_months: "24" })).toEqual({
      warranty_months: 24,
    });
  });
});
