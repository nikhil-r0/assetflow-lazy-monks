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
 * become `overdue`. Notifies holders; logs one batch activity.
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

  // Defense in depth — same date-only rule as the pure helper
  const due = candidates.filter((row) =>
    isOverdueReturn(row.expected_return_date, today),
  );

  if (due.length === 0) {
    return { flagged: 0, allocation_ids: [] };
  }

  const allocation_ids = due.map((row) => row.id);

  await prisma.allocations.updateMany({
    where: {
      id: { in: allocation_ids },
      status: AllocStatus.active,
    },
    data: { status: AllocStatus.overdue },
  });

  for (const row of due) {
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

  await logActivity(actorId, ACT.FLAG_OVERDUE, "allocation", undefined, {
    flagged: allocation_ids.length,
    allocation_ids,
  });

  return { flagged: allocation_ids.length, allocation_ids };
}
