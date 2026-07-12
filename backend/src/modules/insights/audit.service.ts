import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, AuditStatus, AuditResult, NOTIF, ACT } from "../../shared/enums.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";
import { assetService } from "../assets/assets.service.js";

export interface CreateAuditCycleDto {
  name: string;
  scope_department_id?: number;
  scope_location?: string;
  start_date: string;
  end_date: string;
}

export class AuditService {
  // ─── Phase 3 methods ─────────────────────────────────────────────────────

  static async createAuditCycle(dto: CreateAuditCycleDto, createdBy: number) {
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("INVALID_DATES");
    }
    if (endDate < startDate) {
      throw new Error("END_DATE_BEFORE_START_DATE");
    }

    const cycle = await prisma.audit_cycles.create({
      data: {
        name: dto.name,
        scope_department_id: dto.scope_department_id || null,
        scope_location: dto.scope_location || null,
        start_date: startDate,
        end_date: endDate,
        created_by: createdBy,
        status: AuditStatus.open,
      },
    });

    const whereClause: any = { status: { not: AssetStatus.Disposed } };
    if (dto.scope_location) whereClause.location = dto.scope_location;
    if (dto.scope_department_id) {
      whereClause.allocations = {
        some: { department_id: dto.scope_department_id, status: AllocStatus.active },
      };
    }

    const assets = await prisma.assets.findMany({ where: whereClause, select: { id: true } });

    if (assets.length > 0) {
      await prisma.audit_items.createMany({
        data: assets.map((a) => ({ audit_cycle_id: cycle.id, asset_id: a.id, result: null })),
        skipDuplicates: true,
      });
    }

    await logActivity(
      createdBy,
      ACT.CREATE_AUDIT_CYCLE,
      "audit_cycles",
      cycle.id,
      { description: `Created audit cycle "${dto.name}" with ${assets.length} items` }
    );
    return cycle;
  }

  static async assignAuditor(cycleId: number, auditorUserId: number, _assignedBy: number) {
    const cycle = await prisma.audit_cycles.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new Error("CYCLE_NOT_FOUND");

    const user = await prisma.users.findUnique({ where: { id: auditorUserId } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const existing = await prisma.audit_cycle_auditors.findFirst({
      where: { audit_cycle_id: cycleId, auditor_user_id: auditorUserId },
    });
    if (existing) throw new Error("AUDITOR_ALREADY_ASSIGNED");

    const assignment = await prisma.audit_cycle_auditors.create({
      data: { audit_cycle_id: cycleId, auditor_user_id: auditorUserId },
    });

    await createNotification(auditorUserId, NOTIF.AUDIT_ASSIGNMENT, `You have been assigned to audit cycle: ${cycle.name}`, "audit_cycles", cycleId);
    return assignment;
  }

  static async removeAuditor(cycleId: number, auditorUserId: number) {
    await prisma.audit_cycle_auditors.deleteMany({
      where: { audit_cycle_id: cycleId, auditor_user_id: auditorUserId },
    });
  }

  static async getAuditCycles(userId: number, role: string, filters: { status?: AuditStatus; page: number; pageSize: number }) {
    const isManager = role === Role.admin || role === Role.asset_manager;
    const whereClause: any = {};
    if (filters.status) whereClause.status = filters.status;
    if (!isManager) whereClause.auditors = { some: { auditor_user_id: userId } };

    const total = await prisma.audit_cycles.count({ where: whereClause });
    const cycles = await prisma.audit_cycles.findMany({
      where: whereClause,
      include: {
        department: { select: { id: true, name: true } },
        auditors: { include: { auditor: { select: { id: true, name: true, email: true } } } },
        items: { select: { id: true, result: true } },
      },
      orderBy: { id: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });

    const formattedCycles = cycles.map((c) => ({
      id: c.id,
      name: c.name,
      scope_department_id: c.scope_department_id,
      scope_location: c.scope_location,
      start_date: c.start_date,
      end_date: c.end_date,
      status: c.status,
      created_by: c.created_by,
      department: c.department,
      auditors: c.auditors.map((a) => a.auditor),
      progress: {
        checked: c.items.filter((i) => i.result !== null).length,
        verified: c.items.filter((i) => i.result === "verified").length,
        missing: c.items.filter((i) => i.result === "missing").length,
        damaged: c.items.filter((i) => i.result === "damaged").length,
        total: c.items.length,
      },
    }));

    return { total, cycles: formattedCycles };
  }

  static async getAuditCycleById(id: number, userId: number, role: string) {
    const cycle = await prisma.audit_cycles.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        auditors: { include: { auditor: { select: { id: true, name: true, email: true } } } },
        items: {
          include: {
            asset: { select: { id: true, asset_tag: true, name: true, status: true, location: true } },
            verifier: { select: { id: true, name: true, email: true } },
          },
          orderBy: { asset: { asset_tag: "asc" } },
        },
      },
    });

    if (!cycle) return null;

    const isManager = role === Role.admin || role === Role.asset_manager;
    const isAssigned = cycle.auditors.some((a) => a.auditor_user_id === userId);
    if (!isManager && !isAssigned) throw new Error("UNAUTHORIZED_CYCLE_ACCESS");

    return {
      ...cycle,
      auditors: cycle.auditors.map((a) => ({ ...a.auditor, assignment_id: a.id })),
      summary: {
        verified: cycle.items.filter((i) => i.result === "verified").length,
        missing: cycle.items.filter((i) => i.result === "missing").length,
        damaged: cycle.items.filter((i) => i.result === "damaged").length,
        unchecked: cycle.items.filter((i) => i.result === null).length,
        total: cycle.items.length,
      },
    };
  }

  // ─── Phase 4 methods ─────────────────────────────────────────────────────

  /** PATCH /audit-items/:id — mark a single item */
  static async verifyAuditItem(
    itemId: number,
    userId: number,
    role: string,
    body: { result: AuditResult; notes?: string }
  ) {
    const item = await prisma.audit_items.findUnique({
      where: { id: itemId },
      include: {
        audit_cycle: {
          include: { auditors: true },
        },
      },
    });

    if (!item) throw new Error("ITEM_NOT_FOUND");

    // Cycle must be open
    if (item.audit_cycle.status === AuditStatus.closed) {
      throw new Error("CYCLE_CLOSED");
    }

    // Auth: admin/asset_manager OR assigned auditor
    const isManager = role === Role.admin || role === Role.asset_manager;
    const isAssigned = item.audit_cycle.auditors.some((a) => a.auditor_user_id === userId);
    if (!isManager && !isAssigned) throw new Error("UNAUTHORIZED");

    const updated = await prisma.audit_items.update({
      where: { id: itemId },
      data: {
        result: body.result,
        notes: body.notes ?? null,
        verified_by: userId,
        verified_at: new Date(),
      },
    });

    await logActivity(userId, ACT.VERIFY_AUDIT_ITEM, "audit_items", itemId, { result: body.result });
    return updated;
  }

  /** GET /audit-cycles/:id/discrepancy-report */
  static async getDiscrepancyReport(cycleId: number, userId: number, role: string) {
    const cycle = await prisma.audit_cycles.findUnique({
      where: { id: cycleId },
      include: {
        auditors: true,
        items: {
          include: {
            asset: { select: { id: true, asset_tag: true, name: true } },
            verifier: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!cycle) throw new Error("CYCLE_NOT_FOUND");

    const isManager = role === Role.admin || role === Role.asset_manager;
    const isAssigned = cycle.auditors.some((a) => a.auditor_user_id === userId);
    if (!isManager && !isAssigned) throw new Error("UNAUTHORIZED_CYCLE_ACCESS");

    const verified = cycle.items.filter((i) => i.result === AuditResult.verified).length;
    const missing = cycle.items.filter((i) => i.result === AuditResult.missing).length;
    const damaged = cycle.items.filter((i) => i.result === AuditResult.damaged).length;
    const unchecked = cycle.items.filter((i) => i.result === null).length;

    const discrepancies = cycle.items
      .filter((i) => i.result === AuditResult.missing || i.result === AuditResult.damaged)
      .map((i) => ({
        audit_item_id: i.id,
        asset_id: i.asset_id,
        asset_tag: i.asset.asset_tag,
        asset_name: i.asset.name,
        result: i.result,
        notes: i.notes,
        verified_by: i.verifier?.name ?? null,
        verified_at: i.verified_at,
      }));

    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
        status: cycle.status,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
      },
      summary: { verified, missing, damaged, unchecked, total: cycle.items.length },
      discrepancies,
    };
  }

  /** POST /audit-cycles/:id/close */
  static async closeCycle(cycleId: number, userId: number) {
    const cycle = await prisma.audit_cycles.findUnique({
      where: { id: cycleId },
      include: {
        items: { include: { asset: true } },
      },
    });

    if (!cycle) throw new Error("CYCLE_NOT_FOUND");
    if (cycle.status === AuditStatus.closed) throw new Error("ALREADY_CLOSED");

    // Transition all missing assets → Lost (best-effort, skip illegal transitions)
    const skipped: number[] = [];
    for (const item of cycle.items) {
      if (item.result === AuditResult.missing) {
        try {
          await assetService.transitionStatus(item.asset_id, AssetStatus.Lost, userId, `Marked missing during audit cycle: ${cycle.name}`);
        } catch {
          skipped.push(item.asset_id);
        }
      }
    }

    // Close the cycle
    const closed = await prisma.audit_cycles.update({
      where: { id: cycleId },
      data: { status: AuditStatus.closed },
    });

    // Notify creator about each discrepancy
    const discrepancyItems = cycle.items.filter(
      (i) => i.result === AuditResult.missing || i.result === AuditResult.damaged
    );
    for (const item of discrepancyItems) {
      await createNotification(
        cycle.created_by,
        NOTIF.AUDIT_DISCREPANCY,
        `Audit cycle "${cycle.name}" closed with discrepancy: asset ${item.asset.asset_tag} marked ${item.result}`,
        "audit_cycles",
        cycleId
      );
    }

    await logActivity(userId, ACT.CLOSE_AUDIT_CYCLE, "audit_cycles", cycleId);
    return { ...closed, skipped_asset_ids: skipped };
  }
}
