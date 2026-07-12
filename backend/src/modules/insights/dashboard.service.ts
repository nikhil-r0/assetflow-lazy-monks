import { prisma } from "../../shared/prisma";
import { Role, AssetStatus, AllocStatus, BookingStatus, TransferStatus, MaintStatus } from "../../shared/enums";

export interface KpisResponse {
  assets_available: number;
  assets_allocated: number;
  maintenance_today: number;
  active_bookings: number;
  pending_transfers: number;
  upcoming_returns: number;
  overdue_returns: number;
}

export interface OverdueReturnItem {
  id: number;
  asset_id: number;
  asset: {
    id: number;
    asset_tag: string;
    name: string;
  };
  employee: {
    id: number;
    name: string;
    email: string;
  } | null;
  department: {
    id: number;
    name: string;
  } | null;
  allocated_date: Date;
  expected_return_date: Date | null;
  days_overdue: number;
}

export interface UpcomingReturnItem {
  id: number;
  asset_id: number;
  asset: {
    id: number;
    asset_tag: string;
    name: string;
  };
  employee: {
    id: number;
    name: string;
    email: string;
  } | null;
  department: {
    id: number;
    name: string;
  } | null;
  allocated_date: Date;
  expected_return_date: Date | null;
}

function getScopingConditions(userId: number, role: string, departmentId?: number) {
  const isManager = role === Role.admin || role === Role.asset_manager;
  const isDeptHead = role === Role.department_head;

  const allocationWhere: any = {};
  const bookingWhere: any = {};
  const maintenanceWhere: any = {};
  const transferWhere: any = {};

  if (isDeptHead && departmentId) {
    allocationWhere.department_id = departmentId;
    bookingWhere.department_id = departmentId;
    // Maintenance: raised by department member OR on asset allocated to department
    maintenanceWhere.OR = [
      { raiser: { department_id: departmentId } },
      { asset: { allocations: { some: { department_id: departmentId, status: AllocStatus.active } } } }
    ];
    // Transfers: target/source user in department OR asset allocated to department
    transferWhere.OR = [
      { from_user: { department_id: departmentId } },
      { to_user: { department_id: departmentId } },
      { requester: { department_id: departmentId } },
      { asset: { allocations: { some: { department_id: departmentId, status: AllocStatus.active } } } }
    ];
  } else if (!isManager) {
    // Employee role: self scoping
    allocationWhere.employee_id = userId;
    bookingWhere.booked_by_user_id = userId;
    maintenanceWhere.raised_by = userId;
    transferWhere.OR = [
      { from_user_id: userId },
      { to_user_id: userId },
      { requested_by: userId }
    ];
  }

  return { allocationWhere, bookingWhere, maintenanceWhere, transferWhere };
}

export class DashboardService {
  static async getKpis(userId: number, role: string, departmentId?: number): Promise<KpisResponse> {
    const { allocationWhere, bookingWhere, maintenanceWhere, transferWhere } = getScopingConditions(userId, role, departmentId);

    // Date range for upcoming returns: expected_return_date within next 7 days (and status active)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysLaterEnd = new Date();
    sevenDaysLaterEnd.setDate(todayStart.getDate() + 7);
    sevenDaysLaterEnd.setHours(23, 59, 59, 999);

    const isManager = role === Role.admin || role === Role.asset_manager;

    // 1. Assets Available & Assets Allocated
    // Managers see org-wide available assets. Dept heads / Employees see system-wide available assets too (as they can book/request them)
    const assetsAvailableCount = await prisma.assets.count({
      where: { status: AssetStatus.Available }
    });

    let assetsAllocatedCount = 0;
    if (isManager) {
      assetsAllocatedCount = await prisma.assets.count({
        where: { status: AssetStatus.Allocated }
      });
    } else {
      // Scoped allocated count is the count of active/overdue allocations visible to them
      assetsAllocatedCount = await prisma.allocations.count({
        where: {
          ...allocationWhere,
          status: { in: [AllocStatus.active, AllocStatus.overdue] }
        }
      });
    }

    // 2. Active Bookings
    const activeBookingsCount = await prisma.bookings.count({
      where: {
        ...bookingWhere,
        status: { in: [BookingStatus.upcoming, BookingStatus.ongoing] }
      }
    });

    // 3. Maintenance Requests (Open/Active)
    const maintenanceTodayCount = await prisma.maintenance_requests.count({
      where: {
        ...maintenanceWhere,
        status: { in: [MaintStatus.pending, MaintStatus.approved, MaintStatus.technician_assigned, MaintStatus.in_progress] }
      }
    });

    // 4. Pending Transfers
    const pendingTransfersCount = await prisma.transfer_requests.count({
      where: {
        ...transferWhere,
        status: TransferStatus.requested
      }
    });

    // 5. Upcoming Returns
    const upcomingReturnsCount = await prisma.allocations.count({
      where: {
        ...allocationWhere,
        status: AllocStatus.active,
        expected_return_date: {
          gte: todayStart,
          lte: sevenDaysLaterEnd
        }
      }
    });

    // 6. Overdue Returns
    const overdueReturnsCount = await prisma.allocations.count({
      where: {
        ...allocationWhere,
        status: AllocStatus.overdue
      }
    });

    return {
      assets_available: assetsAvailableCount,
      assets_allocated: assetsAllocatedCount,
      maintenance_today: maintenanceTodayCount,
      active_bookings: activeBookingsCount,
      pending_transfers: pendingTransfersCount,
      upcoming_returns: upcomingReturnsCount,
      overdue_returns: overdueReturnsCount
    };
  }

  static async getOverdueReturns(userId: number, role: string, departmentId?: number): Promise<OverdueReturnItem[]> {
    const { allocationWhere } = getScopingConditions(userId, role, departmentId);

    const allocations = await prisma.allocations.findMany({
      where: {
        ...allocationWhere,
        status: AllocStatus.overdue
      },
      include: {
        asset: {
          select: { id: true, asset_tag: true, name: true }
        },
        employee: {
          select: { id: true, name: true, email: true }
        },
        department: {
          select: { id: true, name: true }
        }
      },
      orderBy: { expected_return_date: "asc" }
    });

    const now = new Date();
    return allocations.map((a) => {
      let daysOverdue = 0;
      if (a.expected_return_date) {
        const expected = new Date(a.expected_return_date);
        const diffMs = now.getTime() - expected.getTime();
        daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
      return {
        id: a.id,
        asset_id: a.asset_id,
        asset: a.asset,
        employee: a.employee,
        department: a.department,
        allocated_date: a.allocated_date,
        expected_return_date: a.expected_return_date,
        days_overdue: daysOverdue
      };
    });
  }

  static async getUpcomingReturns(userId: number, role: string, departmentId?: number): Promise<UpcomingReturnItem[]> {
    const { allocationWhere } = getScopingConditions(userId, role, departmentId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysLaterEnd = new Date();
    sevenDaysLaterEnd.setDate(todayStart.getDate() + 7);
    sevenDaysLaterEnd.setHours(23, 59, 59, 999);

    const allocations = await prisma.allocations.findMany({
      where: {
        ...allocationWhere,
        status: AllocStatus.active,
        expected_return_date: {
          gte: todayStart,
          lte: sevenDaysLaterEnd
        }
      },
      include: {
        asset: {
          select: { id: true, asset_tag: true, name: true }
        },
        employee: {
          select: { id: true, name: true, email: true }
        },
        department: {
          select: { id: true, name: true }
        }
      },
      orderBy: { expected_return_date: "asc" }
    });

    return allocations.map((a) => ({
      id: a.id,
      asset_id: a.asset_id,
      asset: a.asset,
      employee: a.employee,
      department: a.department,
      allocated_date: a.allocated_date,
      expected_return_date: a.expected_return_date
    }));
  }
}
