import { Router } from "express";
import { requireAuth } from "../../shared/auth.js";
import { DashboardService } from "./dashboard.service.js";

export const dashboardRouter = Router();

// GET /dashboard/kpis - computed counters scoped by role/department
dashboardRouter.get("/kpis", requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    const kpis = await DashboardService.getKpis(
      actor.id,
      actor.role,
      actor.department_id || undefined
    );
    res.status(200).json(kpis);
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/overdue - allocations with overdue status
dashboardRouter.get("/overdue", requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    const list = await DashboardService.getOverdueReturns(
      actor.id,
      actor.role,
      actor.department_id || undefined
    );
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/upcoming-returns - active allocations due within 7 days
dashboardRouter.get("/upcoming-returns", requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    const list = await DashboardService.getUpcomingReturns(
      actor.id,
      actor.role,
      actor.department_id || undefined
    );
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});
