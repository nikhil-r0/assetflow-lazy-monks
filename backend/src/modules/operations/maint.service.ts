import { ACT, MaintStatus, NOTIF, Priority, Role } from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import type { ListMaintQuery, RaiseMaintenanceInput } from "./maint.schema.js";
import { assertMaintTransition } from "./maintStatus.js";

type Actor = { id: number; role: Role };

async function loadRequest(id: number) {
  const row = await prisma.maintenance_requests.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Maintenance request not found");
  return row;
}

/**
 * Transition with optimistic concurrency: only update if status still matches `from`.
 */
async function transition(
  id: number,
  from: MaintStatus,
  to: MaintStatus,
  data: Record<string, unknown>,
) {
  assertMaintTransition(from, to);
  const result = await prisma.maintenance_requests.updateMany({
    where: { id, status: from },
    data: { status: to, ...data },
  });
  if (result.count === 0) {
    // Re-read for accurate error (missing vs raced)
    await loadRequest(id);
    throw new AppError(
      "UNPROCESSABLE",
      422,
      `Illegal maintenance transition: ${from} → ${to}`,
      [{ field: "status", issue: "illegal_transition", from, to }],
    );
  }
  return prisma.maintenance_requests.findUniqueOrThrow({ where: { id } });
}

/**
 * Track C Phase 2 — full workflow state machine.
 * Asset status flips (Under_Maintenance / Available) deferred to Phase 4.
 */
export const maintService = {
  async raise(input: RaiseMaintenanceInput, actorId: number) {
    const asset = await prisma.assets.findUnique({ where: { id: input.asset_id } });
    if (!asset) throw new NotFoundError("Asset not found");

    const row = await prisma.maintenance_requests.create({
      data: {
        asset_id: input.asset_id,
        raised_by: actorId,
        issue_description: input.issue_description,
        priority: input.priority ?? Priority.medium,
        photo_url: input.photo_url ?? null,
        status: MaintStatus.pending,
      },
    });

    await logActivity(actorId, ACT.RAISE_MAINTENANCE, "maintenance_request", row.id, {
      asset_id: input.asset_id,
    });
    return row;
  },

  async approve(id: number, actor: Actor) {
    const row = await loadRequest(id);
    const updated = await transition(id, row.status as MaintStatus, MaintStatus.approved, {
      approved_by: actor.id,
    });
    await createNotification(
      row.raised_by,
      NOTIF.MAINTENANCE_APPROVED,
      `Maintenance request #${id} approved`,
      "maintenance_request",
      id,
    );
    await logActivity(actor.id, ACT.APPROVE_MAINTENANCE, "maintenance_request", id);
    return updated;
  },

  async reject(id: number, actor: Actor, reason?: string) {
    const row = await loadRequest(id);
    const updated = await transition(id, row.status as MaintStatus, MaintStatus.rejected, {});
    await createNotification(
      row.raised_by,
      NOTIF.MAINTENANCE_REJECTED,
      `Maintenance request #${id} rejected`,
      "maintenance_request",
      id,
    );
    await logActivity(actor.id, ACT.REJECT_MAINTENANCE, "maintenance_request", id, {
      reason,
    });
    return updated;
  },

  async assign(id: number, technicianName: string, _actor: Actor) {
    const row = await loadRequest(id);
    return transition(id, row.status as MaintStatus, MaintStatus.technician_assigned, {
      technician_name: technicianName,
    });
  },

  async start(id: number, _actor: Actor) {
    const row = await loadRequest(id);
    return transition(id, row.status as MaintStatus, MaintStatus.in_progress, {});
  },

  async resolve(id: number, actor: Actor) {
    const row = await loadRequest(id);
    const updated = await transition(id, row.status as MaintStatus, MaintStatus.resolved, {
      resolved_at: new Date(),
    });
    await createNotification(
      row.raised_by,
      NOTIF.MAINTENANCE_RESOLVED,
      `Maintenance request #${id} resolved`,
      "maintenance_request",
      id,
    );
    await logActivity(actor.id, ACT.RESOLVE_MAINTENANCE, "maintenance_request", id);
    return updated;
  },

  async list(query: ListMaintQuery, actor: Actor) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.asset_id != null) where.asset_id = query.asset_id;
    if (query.priority) where.priority = query.priority;
    if (actor.role === Role.employee) {
      where.raised_by = actor.id;
    }

    const [total, data] = await Promise.all([
      prisma.maintenance_requests.count({ where }),
      prisma.maintenance_requests.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },
};
