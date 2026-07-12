/** Pure overdue helpers (BUILD_SPEC Track B Phase 5) — DB flagging wires later. */

/** Strictly past expected_return_date (date-only). Due today is NOT overdue. */
export function isOverdueReturn(
  expectedReturnDate: Date | string | null | undefined,
  today: Date = new Date(),
): boolean {
  if (expectedReturnDate == null) return false;
  const expected = new Date(expectedReturnDate);
  if (Number.isNaN(expected.getTime())) return false;

  const e = Date.UTC(
    expected.getUTCFullYear(),
    expected.getUTCMonth(),
    expected.getUTCDate(),
  );
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return e < t;
}
