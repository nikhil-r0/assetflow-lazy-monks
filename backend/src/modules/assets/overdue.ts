/** Track B Phase 5 — overdue return helpers + DB flagger. */

import { ACT, AllocStatus, NOTIF } from "../../shared/enums.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";

/** Strictly past expected_return_date (date-only UTC). Due today is NOT overdue. */
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

/** UTC midnight for the calendar day of `today`. */
export function startOfUtcDay(today: Date = new Date()): Date {
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}

export type FlagOverdueResult = {
  flagged: number;
  allocation_ids: number[];
};

/**
 * Idempotent: only `active` rows with expected_return_date before today UTC
 * become `overdue`. Per-row CAS (`updateMany` with status=active) so concurrent
 * jobs / returns never double-notify; `flagged` counts actual flips only.
 */
export async function flagOverdueAllocations(
  actorId: number | null = null,
  today: Date = new Date(),
): Promise<FlagOverdueResult> {
  const cutoff = startOfUtcDay(today);

  const candidates = await prisma.allocations.findMany({
    where: {
      status: AllocStatus.active,
      expected_return_date: { not: null, lt: cutoff },
    },
    include: { asset: true, employee: true },
  });

  const due = candidates.filter((row) =>
    isOverdueReturn(row.expected_return_date, today),
  );

  if (due.length === 0) {
    return { flagged: 0, allocation_ids: [] };
  }

  const flippedIds: number[] = [];

  for (const row of due) {
    const result = await prisma.allocations.updateMany({
      where: { id: row.id, status: AllocStatus.active },
      data: { status: AllocStatus.overdue },
    });
    if (result.count === 0) continue;

    flippedIds.push(row.id);

    if (row.employee_id) {
      const tag = row.asset?.asset_tag ?? `#${row.asset_id}`;
      await createNotification(
        row.employee_id,
        NOTIF.OVERDUE_RETURN,
        `Return overdue for asset ${tag}`,
        "allocation",
        row.id,
      );
    }
  }

  if (flippedIds.length > 0) {
    await logActivity(actorId, ACT.FLAG_OVERDUE, "allocation", undefined, {
      flagged: flippedIds.length,
      allocation_ids: flippedIds,
    });
  }

  return { flagged: flippedIds.length, allocation_ids: flippedIds };
}
