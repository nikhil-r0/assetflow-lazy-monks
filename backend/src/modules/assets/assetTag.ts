import { randomBytes } from "node:crypto";

/**
 * BUILD_SPEC §0.6 — AF- + zero-padded id (4 digits; 5+ allowed past 9999).
 * Call after insert so `id` is known; set qr_code = same string.
 */
export function formatAssetTag(id: number): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`asset id must be a positive integer, got ${id}`);
  }
  const width = id > 9999 ? String(id).length : 4;
  return `AF-${String(id).padStart(width, "0")}`;
}

/** Temporary unique tag for the insert-before-update transaction pattern. */
export function placeholderAssetTag(): string {
  return `AF-TEMP-${randomBytes(6).toString("hex")}`;
}
