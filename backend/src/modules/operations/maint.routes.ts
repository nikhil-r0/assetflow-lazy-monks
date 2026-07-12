import { Router } from "express";
import { Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import {
  assignTechnicianSchema,
  listMaintQuerySchema,
  raiseMaintenanceSchema,
  rejectMaintenanceSchema,
} from "./maint.schema.js";
import { maintService } from "./maint.service.js";

export const maintRouter = Router();

function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid id", [
      { field: "id", issue: "invalid" },
    ]);
  }
  return n;
}

maintRouter.post(
  "/",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager, Role.department_head, Role.employee),
  async (req, res, next) => {
    try {
      const parsed = raiseMaintenanceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const row = await maintService.raise(parsed.data, req.user!.id);
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  },
);

maintRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = listMaintQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid query", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "query",
          issue: i.message,
        })),
      ]);
    }
    const result = await maintService.list(parsed.data, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

maintRouter.post(
  "/:id/approve",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const row = await maintService.approve(parseId(req.params.id), {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json(row);
    } catch (err) {
      next(err);
    }
  },
);

maintRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = rejectMaintenanceSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const row = await maintService.reject(
        parseId(req.params.id),
        { id: req.user!.id, role: req.user!.role },
        parsed.data.reason,
      );
      res.status(200).json(row);
    } catch (err) {
      next(err);
    }
  },
);

maintRouter.post(
  "/:id/assign",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = assignTechnicianSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const row = await maintService.assign(
        parseId(req.params.id),
        parsed.data.technician_name,
        { id: req.user!.id, role: req.user!.role },
      );
      res.status(200).json(row);
    } catch (err) {
      next(err);
    }
  },
);

maintRouter.post(
  "/:id/start",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const row = await maintService.start(parseId(req.params.id), {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json(row);
    } catch (err) {
      next(err);
    }
  },
);

maintRouter.post(
  "/:id/resolve",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const row = await maintService.resolve(parseId(req.params.id), {
        id: req.user!.id,
        role: req.user!.role,
      });
      res.status(200).json(row);
    } catch (err) {
      next(err);
    }
  },
);
