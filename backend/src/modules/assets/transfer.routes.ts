import { Router } from "express";
import { Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { transferService } from "./transfer.service.js";
import {
  createTransferSchema,
  listTransfersQuerySchema,
  rejectTransferSchema,
} from "./transfer.schema.js";

export const transferRouter = Router();

function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid id", [
      { field: "id", issue: "invalid" },
    ]);
  }
  return n;
}

transferRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = createTransferSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid transfer body", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "body",
          issue: i.message,
        })),
      ]);
    }
    const row = await transferService.request(parsed.data, req.user!);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

transferRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = listTransfersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid query", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "query",
          issue: i.message,
        })),
      ]);
    }
    res.status(200).json(await transferService.list(parsed.data, req.user!));
  } catch (err) {
    next(err);
  }
});

transferRouter.post(
  "/:id/approve",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager, Role.department_head),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      res.status(200).json(await transferService.approve(id, req.user!));
    } catch (err) {
      next(err);
    }
  },
);

transferRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager, Role.department_head),
  async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const parsed = rejectTransferSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid reject body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      res.status(200).json(await transferService.reject(id, req.user!, parsed.data));
    } catch (err) {
      next(err);
    }
  },
);
