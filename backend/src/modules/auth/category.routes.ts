import { Router } from "express";
import { categoryService } from "./category.service.js";
import {
  createCategorySchema,
  updateCategorySchema,
  createCustomFieldSchema,
} from "./category.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { ACT, Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { logActivity } from "../../shared/activity.js";

export const categoryRoutes = Router();

function zodDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "body",
    issue: i.message,
  }));
}

function parseId(raw: string | string[] | undefined, field = "id"): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, `Invalid ${field}`, [
      { field, issue: "invalid" },
    ]);
  }
  return n;
}

categoryRoutes.post("/", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const category = await categoryService.createCategory(parsed.data);
    await logActivity(req.user!.id, ACT.CREATE_CATEGORY, "asset_categories", category.id);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await categoryService.getCategories();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.patch("/:id", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const updated = await categoryService.updateCategory(id, parsed.data);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.delete("/:id", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await categoryService.deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

categoryRoutes.post("/:id/fields", requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const categoryId = parseId(req.params.id, "categoryId");
    const parsed = createCustomFieldSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", zodDetails(parsed.error));
    }
    const field = await categoryService.createCustomField(categoryId, parsed.data);
    res.status(201).json(field);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.delete(
  "/:categoryId/fields/:fieldId",
  requireAuth,
  requireRole(Role.admin),
  async (req, res, next) => {
    try {
      const categoryId = parseId(req.params.categoryId, "categoryId");
      const fieldId = parseId(req.params.fieldId, "fieldId");
      await categoryService.deleteCustomField(categoryId, fieldId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
