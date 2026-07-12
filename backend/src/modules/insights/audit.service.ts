import { prisma } from "../../shared/prisma.js";
import { Role, AssetStatus, AllocStatus, AuditStatus, NOTIF, ACT } from "../../shared/enums.js";
import { logActivity } from "../../shared/activity.js";
import { createNotification } from "../../shared/notify.js";

export interface CreateAuditCycleDto {
  name: string;
  scope_department_id?: number;
  scope_location?: string;
  start_date: string;
  end_date: string;
}

export class AuditService {
  static async createAuditCycle(dto: CreateAuditCycleDto, createdBy: number) {
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("INVALID_DATES");
    }

    if (endDate < startDate) {
      throw new Error("END_DATE_BEFORE_START_DATE");
    }

    // 1. Create the audit cycle
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

    // 2. Resolve scope & query assets
    const whereClause: any = {
      status: { not: AssetStatus.Disposed },
    };

    if (dto.scope_location) {
      whereClause.location = dto.scope_location;
    }

    if (dto.scope_department_id) {
      whereClause.allocations = {
        some: {
          department_id: dto.scope_department_id,
          status: AllocStatus.active,
        },
      };
    }

    const assets = await prisma.assets.findMany({
      where: whereClause,
      select: { id: true },
    });

    // 3. Populate audit items snapshot
    if (assets.length > 0) {
      const itemsData = assets.map((asset) => ({
        audit_cycle_id: cycle.id,
        asset_id: asset.id,
        result: null,
      }));

      await prisma.audit_items.createMany({
        data: itemsData,
        skipDuplicates: true,
      });
    }

    // 4. Log activity
    await logActivity(
      createdBy,
      ACT.CREATE_AUDIT_CYCLE,
      `Created audit cycle "${dto.name}" with ${assets.length} items`,
      "audit_cycles",
      cycle.id
    );

    return cycle;
  }

  static async assignAuditor(cycleId: number, auditorUserId: number, assignedBy: number) {
    // Check cycle exists
    const cycle = await prisma.audit_cycles.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) {
      throw new Error("CYCLE_NOT_FOUND");
    }

    // Check user exists
    const user = await prisma.users.findUnique({
      where: { id: auditorUserId },
    });
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Check if already assigned
    const existing = await prisma.audit_cycle_auditors.findFirst({
      where: {
        audit_cycle_id: cycleId,
        auditor_user_id: auditorUserId,
      },
    });
    if (existing) {
      throw new Error("AUDITOR_ALREADY_ASSIGNED");
    }

    // Assign
    const assignment = await prisma.audit_cycle_auditors.create({
      data: {
        audit_cycle_id: cycleId,
        auditor_user_id: auditorUserId,
      },
    });

    // Notify assigned auditor
    await createNotification(
      auditorUserId,
      NOTIF.AUDIT_DISCREPANCY,
      `You have been assigned to audit cycle: ${cycle.name}`,
      "audit_cycles",
      cycleId
    );

    return assignment;
  }

  static async removeAuditor(cycleId: number, auditorUserId: number) {
    await prisma.audit_cycle_auditors.deleteMany({
      where: {
        audit_cycle_id: cycleId,
        auditor_user_id: auditorUserId,
      },
    });
  }

  static async getAuditCycles(
    userId: number,
    role: string,
    filters: { status?: AuditStatus; page: number; pageSize: number }
  ) {
    const isManager = role === Role.admin || role === Role.asset_manager;

    const whereClause: any = {};
    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (!isManager) {
      // Non-managers (assigned auditors) only see their assigned cycles
      whereClause.auditors = {
        some: {
          auditor_user_id: userId,
        },
      };
    }

    const total = await prisma.audit_cycles.count({ where: whereClause });

    const cycles = await prisma.audit_cycles.findMany({
      where: whereClause,
      include: {
        department: { select: { id: true, name: true } },
        auditors: {
          include: {
            auditor: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          select: { id: true, result: true },
        },
      },
      orderBy: { id: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });

    // Compute progress stats for list view
    const formattedCycles = cycles.map((c) => {
      const totalItems = c.items.length;
      const verifiedItems = c.items.filter((item) => item.result !== null).length;
      return {
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
          verified: verifiedItems,
          total: totalItems,
        },
      };
    });

    return { total, cycles: formattedCycles };
  }

  static async getAuditCycleById(id: number, userId: number, role: string) {
    const cycle = await prisma.audit_cycles.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        auditors: {
          include: {
            auditor: { select: { id: true, name: true, email: true } },
          },
        },
        items: {
          include: {
            asset: {
              select: { id: true, asset_tag: true, name: true, status: true, location: true },
            },
            verifier: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { asset: { asset_tag: "asc" } },
        },
      },
    });

    if (!cycle) {
      return null;
    }

    // Access control: admins/managers see all; assigned auditors see theirs
    const isManager = role === Role.admin || role === Role.asset_manager;
    const isAssigned = cycle.auditors.some((a) => a.auditor_user_id === userId);
    if (!isManager && !isAssigned) {
      throw new Error("UNAUTHORIZED_CYCLE_ACCESS");
    }

    const total = cycle.items.length;
    const verified = cycle.items.filter((i) => i.result === "verified").length;
    const missing = cycle.items.filter((i) => i.result === "missing").length;
    const damaged = cycle.items.filter((i) => i.result === "damaged").length;
    const unchecked = cycle.items.filter((i) => i.result === null).length;

    return {
      id: cycle.id,
      name: cycle.name,
      scope_department_id: cycle.scope_department_id,
      scope_location: cycle.scope_location,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      status: cycle.status,
      created_by: cycle.created_by,
      department: cycle.department,
      auditors: cycle.auditors.map((a) => a.auditor),
      items: cycle.items,
      summary: {
        verified,
        missing,
        damaged,
        unchecked,
        total,
      },
    };
  }
}
