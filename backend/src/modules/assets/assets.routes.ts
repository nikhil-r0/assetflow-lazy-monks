import { Router } from "express";
import { Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { assetService } from "./assets.service.js";
import {
  addDocumentSchema,
  allocateAssetSchema,
  createAssetSchema,
  listAssetsQuerySchema,
  returnAllocationSchema,
  transitionStatusSchema,
  updateAssetSchema,
} from "./assets.schema.js";

export const assetsRouter = Router();
export const allocationsRouter = Router();

assetsRouter.get("/ping", (_req, res) => {
  res.status(200).json({ module: "assets" });
});

assetsRouter.post(
  "/",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = createAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid asset body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const asset = await assetService.create(parsed.data, req.user!.id);
      res.status(201).json(asset);
    } catch (err) {
      next(err);
    }
  },
);

assetsRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = listAssetsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid query", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "query",
          issue: i.message,
        })),
      ]);
    }
    res.status(200).json(await assetService.list(parsed.data));
  } catch (err) {
    next(err);
  }
});

assetsRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new AppError("VALIDATION_ERROR", 422, "Invalid id");
    res.status(200).json(await assetService.getById(id));
  } catch (err) {
    next(err);
  }
});

assetsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      if ("status" in (req.body ?? {})) {
        throw new AppError(
          "VALIDATION_ERROR",
          422,
          "Cannot set status via PATCH /assets/:id — use PATCH /assets/:id/status",
          [{ field: "status", issue: "forbidden_on_crud" }],
        );
      }
      const parsed = updateAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid patch body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const id = Number(req.params.id);
      res.status(200).json(await assetService.update(id, parsed.data, req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);

assetsRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = transitionStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid status body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const id = Number(req.params.id);
      const updated = await assetService.transitionStatus(
        id,
        parsed.data.status,
        req.user!.id,
        parsed.data.reason,
      );
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
);

assetsRouter.get("/:id/history", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    res.status(200).json(await assetService.getHistory(id));
  } catch (err) {
    next(err);
  }
});

assetsRouter.post(
  "/:id/documents",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = addDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid document body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const id = Number(req.params.id);
      res.status(201).json(await assetService.addDocument(id, parsed.data));
    } catch (err) {
      next(err);
    }
  },
);

allocationsRouter.post(
  "/",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager, Role.department_head),
  async (req, res, next) => {
    try {
      const parsed = allocateAssetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid allocation body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const allocation = await assetService.allocate(parsed.data, {
        id: req.user!.id,
        role: req.user!.role,
        department_id: req.user!.department_id,
      });
      res.status(201).json(allocation);
    } catch (err) {
      next(err);
    }
  },
);

allocationsRouter.post(
  "/:id/return",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (req, res, next) => {
    try {
      const parsed = returnAllocationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid return body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const id = Number(req.params.id);
      res
        .status(200)
        .json(await assetService.returnAllocation(id, parsed.data, req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);
