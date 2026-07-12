import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { ReportsService } from "./reports.service.js";
import { Role } from "../../shared/enums.js";

export const reportsRouter = Router();

// GET /reports/asset-utilization
reportsRouter.get("/asset-utilization", requireAuth, requireRole(Role.admin, Role.asset_manager, Role.department_head), async (req, res, next) => {
  try {
    const actor = req.user!;
    const data = await ReportsService.assetUtilization({
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      userId: actor.id,
      role: actor.role,
    });
    res.json(data);
  } catch (error) { next(error); }
});

// GET /reports/maintenance-frequency
reportsRouter.get("/maintenance-frequency", requireAuth, requireRole(Role.admin, Role.asset_manager, Role.department_head), async (req, res, next) => {
  try {
    const data = await ReportsService.maintenanceFrequency();
    res.json(data);
  } catch (error) { next(error); }
});

// GET /reports/due-for-attention
reportsRouter.get("/due-for-attention", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const years = Number(req.query.years ?? 5);
    const data = await ReportsService.dueForAttention(years);
    res.json(data);
  } catch (error) { next(error); }
});

// GET /reports/department-allocation
reportsRouter.get("/department-allocation", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const data = await ReportsService.departmentAllocation();
    res.json(data);
  } catch (error) { next(error); }
});

// GET /reports/booking-heatmap
reportsRouter.get("/booking-heatmap", requireAuth, requireRole(Role.admin, Role.asset_manager, Role.department_head), async (req, res, next) => {
  try {
    const resourceId = req.query.resource_asset_id ? Number(req.query.resource_asset_id) : undefined;
    const data = await ReportsService.bookingHeatmap(resourceId);
    res.json(data);
  } catch (error) { next(error); }
});

// GET /reports/export?report=<name>&format=csv
reportsRouter.get("/export", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const report = req.query.report as string;
    if (!report) return res.status(400).json({ error: "report query param required" });
    const actor = req.user!;
    try {
      const { csv, filename } = await ReportsService.exportCsv(report, actor.id, actor.role);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err: any) {
      if (err.message === "UNKNOWN_REPORT") return res.status(400).json({ error: "Unknown report type" });
      throw err;
    }
  } catch (error) { next(error); }
});
