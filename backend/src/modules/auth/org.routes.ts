import { Router } from "express";
import { orgService } from "./org.service.js";
import { createDepartmentSchema, updateDepartmentSchema } from "./org.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { ACT, Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";

export const departmentRoutes = Router();

function zodDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "body",
    issue: i.message,
  }));
}

function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid department ID", [
      { field: "id", issue: "invalid" },
    ]);
  }
  return n;
}

departmentRoutes.post("/", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const dept = await orgService.createDepartment(parsed.data);
    await logActivity(req.user!.id, ACT.CREATE_DEPARTMENT, "departments", dept.id);
    res.status(201).json(dept);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await orgService.getDepartments(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const dept = await orgService.getDepartmentById(parseId(req.params.id));
    res.status(200).json(dept);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.patch("/:id", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const updated = await orgService.updateDepartment(id, parsed.data);
    await logActivity(req.user!.id, ACT.UPDATE_DEPARTMENT, "departments", id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.delete("/:id", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await orgService.softDeleteDepartment(id);
    await logActivity(req.user!.id, ACT.UPDATE_DEPARTMENT, "departments", id, {
      action: "soft_delete",
    });
    res.status(200).json({ message: "Department soft deleted" });
  } catch (error) {
    next(error);
  }
});
