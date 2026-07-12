import { Router } from "express";
import { orgService } from "./org.service.js";
import { updateUserRoleSchema, updateUserSchema } from "./org.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { ACT, Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";

export const userRoutes = Router();

function zodDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "body",
    issue: i.message,
  }));
}

function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid user ID", [
      { field: "id", issue: "invalid" },
    ]);
  }
  return n;
}

userRoutes.get("/", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const result = await orgService.getUsers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/** Users eligible as department heads (admin convenience for Org Setup). */
userRoutes.get(
  "/assignable-heads",
  requireAuth,
  requireRole(Role.admin),
  async (_req, res, next) => {
    try {
      const users = await orgService.getAssignableHeads();
      res.status(200).json({ data: users });
    } catch (error) {
      next(error);
    }
  },
);

userRoutes.patch("/:id/role", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const updated = await orgService.updateUserRole(id, parsed.data.role, req.user!.id);
    await logActivity(req.user!.id, ACT.PROMOTE_USER, "users", id, {
      role: parsed.data.role,
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

userRoutes.patch("/:id", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const updated = await orgService.updateUser(id, parsed.data);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});
