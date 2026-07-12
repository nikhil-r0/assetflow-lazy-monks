import { AssetStatus, ACT, MaintStatus, NOTIF, Priority, Role } from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import { assetService } from "../assets/assets.service.js";
import type { ListMaintQuery, RaiseMaintenanceInput } from "./maint.schema.js";
import { assertMaintTransition } from "./maintStatus.js";

type Actor = { id: number; role: Role };

async function loadRequest(id: number) {
  const row = await prisma.maintenance_requests.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Maintenance request not found");
  return row;
}

/**
 * Track C Phase 2 + Phase 4 — workflow state machine with asset status flips.
 * Resolve always returns asset to Available (hackathon scope; see README).
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
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.maintenance_requests.findUnique({ where: { id } });
      if (!row) throw new NotFoundError("Maintenance request not found");
      assertMaintTransition(row.status as MaintStatus, MaintStatus.approved);

      // Serialize concurrent approves on the same asset (Rule 3).
      await tx.$queryRaw`
        SELECT id FROM assets WHERE id = ${row.asset_id} FOR UPDATE
      `;

      const result = await tx.maintenance_requests.updateMany({
        where: { id, status: MaintStatus.pending },
        data: { status: MaintStatus.approved, approved_by: actor.id },
      });
      if (result.count === 0) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          `Illegal maintenance transition: ${row.status} → ${MaintStatus.approved}`,
          [{ field: "status", issue: "illegal_transition" }],
        );
      }

      await assetService.transitionStatusTx(
        tx,
        row.asset_id,
        AssetStatus.Under_Maintenance,
        actor.id,
        "maintenance approved",
      );

      return tx.maintenance_requests.findUniqueOrThrow({ where: { id } });
    });

    await createNotification(
      updated.raised_by,
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
    assertMaintTransition(row.status as MaintStatus, MaintStatus.rejected);
    const result = await prisma.maintenance_requests.updateMany({
      where: { id, status: MaintStatus.pending },
      data: { status: MaintStatus.rejected },
    });
    if (result.count === 0) {
      throw new AppError(
        "UNPROCESSABLE",
        422,
        `Illegal maintenance transition: ${row.status} → ${MaintStatus.rejected}`,
        [{ field: "status", issue: "illegal_transition" }],
      );
    }
    const updated = await prisma.maintenance_requests.findUniqueOrThrow({ where: { id } });
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
    assertMaintTransition(row.status as MaintStatus, MaintStatus.technician_assigned);
    const result = await prisma.maintenance_requests.updateMany({
      where: { id, status: MaintStatus.approved },
      data: {
        status: MaintStatus.technician_assigned,
        technician_name: technicianName,
      },
    });
    if (result.count === 0) {
      throw new AppError(
        "UNPROCESSABLE",
        422,
        `Illegal maintenance transition: ${row.status} → ${MaintStatus.technician_assigned}`,
        [{ field: "status", issue: "illegal_transition" }],
      );
    }
    return prisma.maintenance_requests.findUniqueOrThrow({ where: { id } });
  },

  async start(id: number, _actor: Actor) {
    const row = await loadRequest(id);
    assertMaintTransition(row.status as MaintStatus, MaintStatus.in_progress);
    const result = await prisma.maintenance_requests.updateMany({
      where: { id, status: MaintStatus.technician_assigned },
      data: { status: MaintStatus.in_progress },
    });
    if (result.count === 0) {
      throw new AppError(
        "UNPROCESSABLE",
        422,
        `Illegal maintenance transition: ${row.status} → ${MaintStatus.in_progress}`,
        [{ field: "status", issue: "illegal_transition" }],
      );
    }
    return prisma.maintenance_requests.findUniqueOrThrow({ where: { id } });
  },

  async resolve(id: number, actor: Actor) {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.maintenance_requests.findUnique({ where: { id } });
      if (!row) throw new NotFoundError("Maintenance request not found");
      assertMaintTransition(row.status as MaintStatus, MaintStatus.resolved);

      const result = await tx.maintenance_requests.updateMany({
        where: { id, status: MaintStatus.in_progress },
        data: { status: MaintStatus.resolved, resolved_at: new Date() },
      });
      if (result.count === 0) {
        throw new AppError(
          "UNPROCESSABLE",
          422,
          `Illegal maintenance transition: ${row.status} → ${MaintStatus.resolved}`,
          [{ field: "status", issue: "illegal_transition" }],
        );
      }

      // Hackathon scope: resolve always → Available (even if previously Allocated).
      await assetService.transitionStatusTx(
        tx,
        row.asset_id,
        AssetStatus.Available,
        actor.id,
        "maintenance resolved",
      );

      return tx.maintenance_requests.findUniqueOrThrow({ where: { id } });
    });

    await createNotification(
      updated.raised_by,
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
        include: {
          asset: { select: { id: true, asset_tag: true, name: true, status: true } },
        },
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
