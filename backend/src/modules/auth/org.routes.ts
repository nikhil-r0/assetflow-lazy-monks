import { Router } from "express";
import { orgService } from "./org.service.js";
import { createDepartmentSchema, updateDepartmentSchema } from "./org.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { AppError } from "../../shared/errors.js";

export const departmentRoutes = Router();

departmentRoutes.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }
    const dept = await orgService.createDepartment(parsed.data);
    // TODO: logActivity(req.user.id, ACT.CREATE_DEPARTMENT, 'departments', dept.id)
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid department ID");
    }
    const dept = await orgService.getDepartmentById(id);
    res.status(200).json(dept);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid department ID");
    }
    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }
    const updated = await orgService.updateDepartment(id, parsed.data);
    // TODO: logActivity(req.user.id, ACT.UPDATE_DEPARTMENT, 'departments', id)
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

departmentRoutes.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid department ID");
    }
    await orgService.softDeleteDepartment(id);
    res.status(200).json({ message: "Department soft deleted" });
  } catch (error) {
    next(error);
  }
});
