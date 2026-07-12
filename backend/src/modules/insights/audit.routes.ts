import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { AuditService } from "./audit.service.js";
import { parsePagination, buildEnvelope } from "../../shared/pagination.js";
import { Role, AuditStatus, AuditResult } from "../../shared/enums.js";

export const auditRouter = Router();

// ─── Phase 3 Routes ──────────────────────────────────────────────────────────

auditRouter.post("/", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const { name, scope_department_id, scope_location, start_date, end_date } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required fields: name, start_date, end_date" });
    }
    const actor = req.user!;
    try {
      const cycle = await AuditService.createAuditCycle(
        { name, scope_department_id: scope_department_id ? Number(scope_department_id) : undefined, scope_location, start_date, end_date },
        actor.id
      );
      res.status(201).json(cycle);
    } catch (err: any) {
      if (err.message === "END_DATE_BEFORE_START_DATE" || err.message === "INVALID_DATES") {
        return res.status(422).json({ error: err.message });
      }
      throw err;
    }
  } catch (error) { next(error); }
});

auditRouter.post("/:id/auditors", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const cycleId = Number(req.params.id);
    const { auditor_user_id } = req.body;
    if (!auditor_user_id) return res.status(400).json({ error: "Missing auditor_user_id" });
    const actor = req.user!;
    try {
      const assignment = await AuditService.assignAuditor(cycleId, Number(auditor_user_id), actor.id);
      res.status(201).json(assignment);
    } catch (err: any) {
      if (err.message === "CYCLE_NOT_FOUND" || err.message === "USER_NOT_FOUND") return res.status(404).json({ error: err.message });
      if (err.message === "AUDITOR_ALREADY_ASSIGNED") return res.status(409).json({ error: err.message });
      throw err;
    }
  } catch (error) { next(error); }
});

auditRouter.delete("/:id/auditors/:auditorId", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    await AuditService.removeAuditor(Number(req.params.id), Number(req.params.auditorId));
    res.status(204).end();
  } catch (error) { next(error); }
});

auditRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    const statusFilter = req.query.status as AuditStatus | undefined;
    const actor = req.user!;
    const { total, cycles } = await AuditService.getAuditCycles(actor.id, actor.role, {
      status: statusFilter,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    res.status(200).json(buildEnvelope(cycles, total, pagination.page, pagination.pageSize));
  } catch (error) { next(error); }
});

auditRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    try {
      const cycle = await AuditService.getAuditCycleById(Number(req.params.id), actor.id, actor.role);
      if (!cycle) return res.status(404).json({ error: "Audit cycle not found" });
      res.status(200).json(cycle);
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED_CYCLE_ACCESS") return res.status(403).json({ error: err.message });
      throw err;
    }
  } catch (error) { next(error); }
});

// ─── Phase 4 Routes ──────────────────────────────────────────────────────────

auditRouter.get("/:id/discrepancy-report", requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    try {
      const report = await AuditService.getDiscrepancyReport(Number(req.params.id), actor.id, actor.role);
      res.status(200).json(report);
    } catch (err: any) {
      if (err.message === "CYCLE_NOT_FOUND") return res.status(404).json({ error: err.message });
      if (err.message === "UNAUTHORIZED_CYCLE_ACCESS") return res.status(403).json({ error: err.message });
      throw err;
    }
  } catch (error) { next(error); }
});

auditRouter.post("/:id/close", requireAuth, requireRole(Role.admin, Role.asset_manager), async (req, res, next) => {
  try {
    const actor = req.user!;
    try {
      const result = await AuditService.closeCycle(Number(req.params.id), actor.id);
      res.status(200).json(result);
    } catch (err: any) {
      if (err.message === "CYCLE_NOT_FOUND") return res.status(404).json({ error: err.message });
      if (err.message === "ALREADY_CLOSED") return res.status(422).json({ error: err.message });
      throw err;
    }
  } catch (error) { next(error); }
});

// ─── Audit Items Router (mounted at /api/v1/audit-items) ─────────────────────
import { Router as ItemRouter } from "express";
export const auditItemRouter = ItemRouter();

auditItemRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const { result, notes } = req.body;
    const validResults = [AuditResult.verified, AuditResult.missing, AuditResult.damaged];
    if (!result || !validResults.includes(result)) {
      return res.status(400).json({ error: `result must be one of: ${validResults.join(", ")}` });
    }
    const actor = req.user!;
    try {
      const updated = await AuditService.verifyAuditItem(Number(req.params.id), actor.id, actor.role, { result, notes });
      res.status(200).json(updated);
    } catch (err: any) {
      if (err.message === "ITEM_NOT_FOUND") return res.status(404).json({ error: err.message });
      if (err.message === "CYCLE_CLOSED") return res.status(422).json({ error: err.message });
      if (err.message === "UNAUTHORIZED") return res.status(403).json({ error: err.message });
      throw err;
    }
  } catch (error) { next(error); }
});
