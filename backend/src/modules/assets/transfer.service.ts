import {
  ACT,
  AllocStatus,
  AssetStatus,
  NOTIF,
  Role,
  TransferStatus,
} from "../../shared/enums.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import type { UserPayload } from "../../shared/auth.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { prisma } from "../../shared/prisma.js";
import type {
  CreateTransferInput,
  ListTransfersQuery,
  RejectTransferInput,
} from "./transfer.schema.js";

function activeAllocationWhere(assetId: number) {
  return {
    asset_id: assetId,
    status: { in: [AllocStatus.active, AllocStatus.overdue] as AllocStatus[] },
  };
}

export const transferService = {
  async request(input: CreateTransferInput, actor: UserPayload) {
    const asset = await prisma.assets.findUnique({ where: { id: input.asset_id } });
    if (!asset) throw new NotFoundError("Asset not found");

    const toUser = await prisma.users.findUnique({ where: { id: input.to_user_id } });
    if (!toUser) throw new NotFoundError("Target user not found");

    const active = await prisma.allocations.findFirst({
      where: activeAllocationWhere(input.asset_id),
      include: { employee: true, department: true },
    });
    if (!active) {
      throw new AppError("UNPROCESSABLE", 422, "Asset has no active allocation to transfer", [
        { field: "asset_id", issue: "not_allocated" },
      ]);
    }
    if (active.employee_id != null && active.employee_id === input.to_user_id) {
      throw new AppError("UNPROCESSABLE", 422, "Target user already holds this asset", [
        { field: "to_user_id", issue: "already_holder" },
      ]);
    }

    const created = await prisma.transfer_requests.create({
      data: {
        asset_id: input.asset_id,
        from_user_id: active.employee_id,
        to_user_id: input.to_user_id,
        requested_by: actor.id,
        status: TransferStatus.requested,
      },
      include: {
        asset: true,
        from_user: true,
        to_user: true,
        requester: true,
      },
    });

    if (active.employee_id) {
      await createNotification(
        active.employee_id,
        NOTIF.TRANSFER_REQUESTED,
        `Transfer requested for ${asset.asset_tag}`,
        "transfer_request",
        created.id,
      );
    }
    await createNotification(
      input.to_user_id,
      NOTIF.TRANSFER_REQUESTED,
      `You were requested as new holder of ${asset.asset_tag}`,
      "transfer_request",
      created.id,
    );
    await logActivity(actor.id, ACT.REQUEST_TRANSFER, "transfer_request", created.id, {
      asset_id: input.asset_id,
      to_user_id: input.to_user_id,
    });

    return created;
  },

  async approve(id: number, actor: UserPayload) {
    return prisma.$transaction(async (tx) => {
      const req = await tx.transfer_requests.findUnique({
        where: { id },
        include: { asset: true },
      });
      if (!req) throw new NotFoundError("Transfer request not found");
      if (req.status !== TransferStatus.requested) {
        throw new AppError("UNPROCESSABLE", 422, "Transfer is not in requested state", [
          { field: "status", issue: "not_requested", status: req.status },
        ]);
      }

      const active = await tx.allocations.findFirst({
        where: activeAllocationWhere(req.asset_id),
        include: { employee: true, department: true },
      });
      if (!active) {
        throw new AppError("UNPROCESSABLE", 422, "No active allocation to transfer", [
          { field: "asset_id", issue: "not_allocated" },
        ]);
      }

      // Department head: only own dept (allocation dept or holder's dept)
      if (actor.role === Role.department_head) {
        const holderDept =
          active.department_id ?? active.employee?.department_id ?? null;
        if (
          actor.department_id == null ||
          holderDept == null ||
          holderDept !== actor.department_id
        ) {
          throw new AppError("FORBIDDEN", 403, "Department head can only approve own-dept transfers", [
            { field: "department_id", issue: "out_of_scope" },
          ]);
        }
      }

      const competing = await tx.transfer_requests.findFirst({
        where: {
          asset_id: req.asset_id,
          status: TransferStatus.completed,
          created_at: { gt: req.created_at },
          id: { not: req.id },
        },
      });
      if (competing) {
        throw new AppError("CONFLICT", 409, "A competing transfer already completed for this asset", [
          { field: "asset_id", issue: "competing_transfer", transfer_id: competing.id },
        ]);
      }

      await tx.allocations.update({
        where: { id: active.id },
        data: {
          status: AllocStatus.returned,
          actual_return_date: new Date(),
        },
      });

      const newAlloc = await tx.allocations.create({
        data: {
          asset_id: req.asset_id,
          employee_id: req.to_user_id,
          department_id: null,
          status: AllocStatus.active,
        },
      });

      // Keep asset Allocated
      if (req.asset.status !== AssetStatus.Allocated) {
        await tx.assets.update({
          where: { id: req.asset_id },
          data: { status: AssetStatus.Allocated },
        });
      }

      const updated = await tx.transfer_requests.update({
        where: { id },
        data: {
          status: TransferStatus.completed,
          approved_by: actor.id,
        },
        include: {
          asset: true,
          from_user: true,
          to_user: true,
          requester: true,
          approver: true,
        },
      });

      await createNotification(
        req.to_user_id,
        NOTIF.TRANSFER_APPROVED,
        `Transfer approved — you now hold ${req.asset.asset_tag}`,
        "transfer_request",
        id,
      );
      await createNotification(
        req.to_user_id,
        NOTIF.ASSET_ASSIGNED,
        `Asset ${req.asset.asset_tag} assigned to you`,
        "allocation",
        newAlloc.id,
      );
      if (req.from_user_id) {
        await createNotification(
          req.from_user_id,
          NOTIF.TRANSFER_APPROVED,
          `Transfer of ${req.asset.asset_tag} approved`,
          "transfer_request",
          id,
        );
      }
      await logActivity(actor.id, ACT.APPROVE_TRANSFER, "transfer_request", id, {
        asset_id: req.asset_id,
        new_allocation_id: newAlloc.id,
        closed_allocation_id: active.id,
      });

      return updated;
    });
  },

  async reject(id: number, actor: UserPayload, input: RejectTransferInput = {}) {
    const req = await prisma.transfer_requests.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!req) throw new NotFoundError("Transfer request not found");
    if (req.status !== TransferStatus.requested) {
      throw new AppError("UNPROCESSABLE", 422, "Transfer is not in requested state", [
        { field: "status", issue: "not_requested", status: req.status },
      ]);
    }

    if (actor.role === Role.department_head) {
      const active = await prisma.allocations.findFirst({
        where: activeAllocationWhere(req.asset_id),
        include: { employee: true },
      });
      const holderDept =
        active?.department_id ?? active?.employee?.department_id ?? null;
      if (
        actor.department_id == null ||
        holderDept == null ||
        holderDept !== actor.department_id
      ) {
        throw new AppError("FORBIDDEN", 403, "Department head can only reject own-dept transfers", [
          { field: "department_id", issue: "out_of_scope" },
        ]);
      }
    }

    const updated = await prisma.transfer_requests.update({
      where: { id },
      data: {
        status: TransferStatus.rejected,
        approved_by: actor.id,
      },
      include: {
        asset: true,
        from_user: true,
        to_user: true,
        requester: true,
        approver: true,
      },
    });

    await createNotification(
      req.requested_by,
      NOTIF.TRANSFER_REJECTED,
      `Transfer request for asset #${req.asset_id} was rejected`,
      "transfer_request",
      id,
    );
    await logActivity(actor.id, ACT.REJECT_TRANSFER, "transfer_request", id, {
      reason: input.reason ?? null,
    });

    return updated;
  },

  async list(query: ListTransfersQuery, actor: UserPayload) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.asset_id != null) where.asset_id = query.asset_id;

    // Employees see requests they created or are party to
    if (actor.role === Role.employee) {
      where.OR = [
        { requested_by: actor.id },
        { to_user_id: actor.id },
        { from_user_id: actor.id },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.transfer_requests.count({ where }),
      prisma.transfer_requests.findMany({
        where,
        include: {
          asset: true,
          from_user: true,
          to_user: true,
          requester: true,
          approver: true,
        },
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
