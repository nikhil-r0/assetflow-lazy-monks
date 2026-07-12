import { FieldType } from "@prisma/client";
import { prisma } from "../../prismaClient.js";
import { AppError, NotFoundError } from "../../shared/errors.js";

export class CategoryService {
  async createCategory(data: { name: string }) {
    const existing = await prisma.asset_categories.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new AppError("CONFLICT", 409, "Category name already exists");
    }

    const category = await prisma.asset_categories.create({
      data: { name: data.name },
      include: { custom_fields: true },
    });

    return category;
  }

  async getCategories() {
    const items = await prisma.asset_categories.findMany({
      include: { custom_fields: true },
      orderBy: { id: "asc" },
    });

    return {
      data: items,
      total: items.length,
      page: 1,
      pageSize: items.length > 0 ? items.length : 1,
      totalPages: 1,
    };
  }

  async updateCategory(id: number, data: { name: string }) {
    const category = await prisma.asset_categories.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    if (data.name !== category.name) {
      const existing = await prisma.asset_categories.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new AppError("CONFLICT", 409, "Category name already exists");
      }
    }

    const updated = await prisma.asset_categories.update({
      where: { id },
      data: { name: data.name },
      include: { custom_fields: true },
    });

    return updated;
  }

  async deleteCategory(id: number) {
    const category = await prisma.asset_categories.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const assetsCount = await prisma.assets.count({
      where: { category_id: id },
    });
    if (assetsCount > 0) {
      throw new AppError("CONFLICT", 409, "Cannot delete category because it is in use by assets");
    }

    await prisma.asset_categories.delete({
      where: { id },
    });
  }

  async createCustomField(categoryId: number, data: { field_name: string; field_type: FieldType }) {
    const category = await prisma.asset_categories.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundError("Category not found");
    }

    const existingField = await prisma.category_custom_fields.findUnique({
      where: {
        category_id_field_name: {
          category_id: categoryId,
          field_name: data.field_name,
        },
      },
    });
    if (existingField) {
      throw new AppError("CONFLICT", 409, "Custom field name already exists in this category");
    }

    const field = await prisma.category_custom_fields.create({
      data: {
        category_id: categoryId,
        field_name: data.field_name,
        field_type: data.field_type,
      },
    });

    return field;
  }

  async deleteCustomField(categoryId: number, fieldId: number) {
    const field = await prisma.category_custom_fields.findUnique({
      where: { id: fieldId },
    });
    if (!field || field.category_id !== categoryId) {
      throw new NotFoundError("Custom field not found in this category");
    }

    await prisma.category_custom_fields.delete({
      where: { id: fieldId },
    });
  }
}

export const categoryService = new CategoryService();
