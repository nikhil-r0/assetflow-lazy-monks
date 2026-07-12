import { Router } from "express";
import { orgService } from "./org.service.js";
import { updateUserRoleSchema, updateUserSchema } from "./org.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { AppError } from "../../shared/errors.js";

export const userRoutes = Router();

userRoutes.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const result = await orgService.getUsers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

userRoutes.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid user ID");
    }
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }
    const updated = await orgService.updateUserRole(id, parsed.data.role, (req as any).user.id);
    // TODO: logActivity(req.user.id, ACT.PROMOTE_USER, 'users', id)
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

userRoutes.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid user ID");
    }
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }
    const updated = await orgService.updateUser(id, parsed.data);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});
