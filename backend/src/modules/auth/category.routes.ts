import { Router } from "express";
import { categoryService } from "./category.service.js";
import { createCategorySchema, updateCategorySchema, createCustomFieldSchema } from "./category.schema.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { AppError } from "../../shared/errors.js";

export const categoryRoutes = Router();

categoryRoutes.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }
    const category = await categoryService.createCategory(parsed.data);
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

categoryRoutes.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError("VALIDATION_ERROR", 422, "Invalid category ID");

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }

    const updated = await categoryService.updateCategory(id, parsed.data);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError("VALIDATION_ERROR", 422, "Invalid category ID");

    await categoryService.deleteCategory(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

categoryRoutes.post("/:id/fields", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) throw new AppError("VALIDATION_ERROR", 422, "Invalid category ID");

    const parsed = createCustomFieldSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", parsed.error.errors);
    }

    const field = await categoryService.createCustomField(categoryId, parsed.data);
    res.status(201).json(field);
  } catch (error) {
    next(error);
  }
});

categoryRoutes.delete("/:categoryId/fields/:fieldId", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    const fieldId = parseInt(req.params.fieldId, 10);
    if (isNaN(categoryId) || isNaN(fieldId)) throw new AppError("VALIDATION_ERROR", 422, "Invalid ID");

    await categoryService.deleteCustomField(categoryId, fieldId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
