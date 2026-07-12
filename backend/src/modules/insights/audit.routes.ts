import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { AuditService } from "./audit.service.js";
import { parsePagination, buildEnvelope } from "../../shared/pagination.js";
import { AuditStatus } from "../../shared/enums.js";

export const auditRouter = Router();

// POST /audit-cycles - Create a new audit cycle & populate in-scope items
auditRouter.post("/", requireAuth, requireRole("admin", "asset_manager"), async (req, res, next) => {
  try {
    const { name, scope_department_id, scope_location, start_date, end_date } = req.body;

    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required fields: name, start_date, end_date" });
    }

    try {
      const cycle = await AuditService.createAuditCycle(
        {
          name,
          scope_department_id: scope_department_id ? Number(scope_department_id) : undefined,
          scope_location,
          start_date,
          end_date,
        },
        req.user.id
      );
      res.status(201).json(cycle);
    } catch (err: any) {
      if (err.message === "END_DATE_BEFORE_START_DATE" || err.message === "INVALID_DATES") {
        return res.status(422).json({ error: err.message });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
});

// POST /audit-cycles/:id/auditors - Assign an auditor to a cycle
auditRouter.post("/:id/auditors", requireAuth, requireRole("admin", "asset_manager"), async (req, res, next) => {
  try {
    const cycleId = Number(req.params.id);
    const { auditor_user_id } = req.body;

    if (!auditor_user_id) {
      return res.status(400).json({ error: "Missing auditor_user_id" });
    }

    try {
      const assignment = await AuditService.assignAuditor(cycleId, Number(auditor_user_id), req.user.id);
      res.status(201).json(assignment);
    } catch (err: any) {
      if (err.message === "CYCLE_NOT_FOUND" || err.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: err.message });
      }
      if (err.message === "AUDITOR_ALREADY_ASSIGNED") {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /audit-cycles/:id/auditors/:auditorId - Unassign/remove an auditor
auditRouter.delete(
  "/:id/auditors/:auditorId",
  requireAuth,
  requireRole("admin", "asset_manager"),
  async (req, res, next) => {
    try {
      const cycleId = Number(req.params.id);
      const auditorId = Number(req.params.auditorId);

      await AuditService.removeAuditor(cycleId, auditorId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// GET /audit-cycles - List audit cycles (scoped, paginated)
auditRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    const statusFilter = req.query.status as AuditStatus | undefined;

    const { total, cycles } = await AuditService.getAuditCycles(req.user.id, req.user.role, {
      status: statusFilter,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    res.status(200).json(buildEnvelope(cycles, total, pagination.page, pagination.pageSize));
  } catch (error) {
    next(error);
  }
});

// GET /audit-cycles/:id - Get audit cycle details (scoped)
auditRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const cycleId = Number(req.params.id);

    try {
      const cycle = await AuditService.getAuditCycleById(cycleId, req.user.id, req.user.role);
      if (!cycle) {
        return res.status(404).json({ error: "Audit cycle not found" });
      }
      res.status(200).json(cycle);
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED_CYCLE_ACCESS") {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
});
