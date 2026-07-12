import { prisma } from "../../shared/prisma.js";
import { Role, BookingStatus } from "../../shared/enums.js";

function scopeFilter(userId: number, role: string, departmentId?: number) {
  const isManager = role === Role.admin || role === Role.asset_manager;
  const isDeptHead = role === Role.department_head;
  return { isManager, isDeptHead };
}

export class ReportsService {
  // ── 1. Asset Utilization ──────────────────────────────────────────────────
  static async assetUtilization(params: { from?: string; to?: string; userId: number; role: string }) {
    const fromDate = params.from ? new Date(params.from) : undefined;
    const toDate = params.to ? new Date(params.to) : undefined;

    const assets = await prisma.assets.findMany({
      select: {
        id: true,
        asset_tag: true,
        name: true,
        allocations: {
          where: {
            ...(fromDate || toDate
              ? {
                  allocated_date: {
                    ...(fromDate ? { gte: fromDate } : {}),
                    ...(toDate ? { lte: toDate } : {}),
                  },
                }
              : {}),
          },
          select: {
            allocated_date: true,
            actual_return_date: true,
          },
        },
      },
    });

    const now = new Date();
    return assets.map((asset) => {
      const allocation_count = asset.allocations.length;
      let days_allocated = 0;
      for (const alloc of asset.allocations) {
        const end = alloc.actual_return_date ?? now;
        const diff = end.getTime() - alloc.allocated_date.getTime();
        days_allocated += Math.max(0, Math.floor(diff / 86400000));
      }
      return {
        asset_id: asset.id,
        asset_tag: asset.asset_tag,
        name: asset.name,
        allocation_count,
        days_allocated,
        is_idle: allocation_count === 0,
      };
    });
  }

  // ── 2. Maintenance Frequency ──────────────────────────────────────────────
  static async maintenanceFrequency() {
    // By asset
    const byAsset = await prisma.maintenance_requests.groupBy({
      by: ["asset_id"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const assetIds = byAsset.map((r) => r.asset_id);
    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, asset_tag: true, name: true, category: { select: { name: true } } },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // By category (join through asset)
    const byCategoryRaw = await prisma.maintenance_requests.findMany({
      select: { asset: { select: { category: { select: { name: true } } } } },
    });
    const categoryCount: Record<string, number> = {};
    for (const r of byCategoryRaw) {
      const cat = r.asset.category.name;
      categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
    }

    return {
      by_asset: byAsset.map((r) => ({
        asset_id: r.asset_id,
        asset_tag: assetMap.get(r.asset_id)?.asset_tag ?? "",
        name: assetMap.get(r.asset_id)?.name ?? "",
        request_count: r._count.id,
      })),
      by_category: Object.entries(categoryCount)
        .map(([category, request_count]) => ({ category, request_count }))
        .sort((a, b) => b.request_count - a.request_count),
    };
  }

  // ── 3. Due for Attention ──────────────────────────────────────────────────
  static async dueForAttention(yearsThreshold = 5) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - yearsThreshold);

    const aged = await prisma.assets.findMany({
      where: {
        acquisition_date: { lte: cutoff },
        status: { notIn: ["Retired", "Disposed"] },
      },
      select: { id: true, asset_tag: true, name: true, acquisition_date: true, status: true },
    });

    // High-maintenance assets (> 3 requests)
    const highMaint = await prisma.maintenance_requests.groupBy({
      by: ["asset_id"],
      _count: { id: true },
      having: { id: { _count: { gt: 3 } } },
    });
    const highMaintIds = new Set(highMaint.map((r) => r.asset_id));
    const highMaintAssets = await prisma.assets.findMany({
      where: { id: { in: [...highMaintIds] } },
      select: { id: true, asset_tag: true, name: true, status: true },
    });

    return {
      aged_assets: aged.map((a) => ({
        ...a,
        reason: `Acquisition date over ${yearsThreshold} years ago`,
      })),
      high_maintenance: highMaintAssets.map((a) => ({
        ...a,
        reason: "High maintenance frequency (>3 requests)",
      })),
    };
  }

  // ── 4. Department Allocation ──────────────────────────────────────────────
  static async departmentAllocation() {
    const depts = await prisma.departments.findMany({
      select: {
        id: true,
        name: true,
        allocations: {
          where: { status: "active" },
          include: {
            asset: { select: { acquisition_cost: true } },
          },
        },
      },
    });

    return depts.map((dept) => {
      const active_allocations = dept.allocations.length;
      const total_asset_value = dept.allocations.reduce((sum, a) => {
        return sum + Number(a.asset.acquisition_cost ?? 0);
      }, 0);
      return {
        department_id: dept.id,
        department: dept.name,
        active_allocations,
        total_asset_value: Math.round(total_asset_value * 100) / 100,
      };
    });
  }

  // ── 5. Booking Heatmap ───────────────────────────────────────────────────
  static async bookingHeatmap(resourceAssetId?: number) {
    const bookings = await prisma.bookings.findMany({
      where: {
        status: { notIn: [BookingStatus.cancelled] },
        ...(resourceAssetId ? { resource_asset_id: resourceAssetId } : {}),
      },
      select: { start_time: true },
    });

    const buckets: Record<string, number> = {};
    for (const b of bookings) {
      const d = new Date(b.start_time);
      const weekday = d.getDay(); // 0=Sun
      const hour = d.getHours();
      const key = `${weekday}-${hour}`;
      buckets[key] = (buckets[key] ?? 0) + 1;
    }

    return Object.entries(buckets).map(([key, count]) => {
      const [weekday, hour] = key.split("-").map(Number);
      return { weekday, hour, count };
    });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  static async exportCsv(report: string, userId: number, role: string): Promise<{ csv: string; filename: string }> {
    let rows: any[] = [];
    let headers: string[] = [];

    switch (report) {
      case "asset-utilization": {
        rows = await ReportsService.assetUtilization({ userId, role });
        headers = ["asset_id", "asset_tag", "name", "allocation_count", "days_allocated", "is_idle"];
        break;
      }
      case "maintenance-frequency": {
        const data = await ReportsService.maintenanceFrequency();
        rows = data.by_asset;
        headers = ["asset_id", "asset_tag", "name", "request_count"];
        break;
      }
      case "department-allocation": {
        rows = await ReportsService.departmentAllocation();
        headers = ["department_id", "department", "active_allocations", "total_asset_value"];
        break;
      }
      case "booking-heatmap": {
        rows = await ReportsService.bookingHeatmap();
        headers = ["weekday", "hour", "count"];
        break;
      }
      default:
        throw new Error("UNKNOWN_REPORT");
    }

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = r[h];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val ?? "");
        }).join(",")
      ),
    ].join("\n");

    return { csv, filename: `${report}-${new Date().toISOString().slice(0, 10)}.csv` };
  }
}
