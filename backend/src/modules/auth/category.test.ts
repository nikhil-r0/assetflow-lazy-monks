import { describe, it, expect, vi, beforeEach } from "vitest";
import { categoryService } from "./category.service.js";
import { prisma } from "../../prismaClient.js";

vi.mock("../../prismaClient.js", () => ({
  prisma: {
    asset_categories: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    category_custom_fields: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    assets: {
      count: vi.fn(),
    },
  },
}));

describe("CategoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("create_category_duplicate_conflict", async () => {
      vi.mocked(prisma.asset_categories.findUnique).mockResolvedValue({ id: 1, name: "Laptops" } as any);

      await expect(
        categoryService.createCategory({ name: "Laptops" })
      ).rejects.toThrow("Category name already exists");
    });
  });

  describe("deleteCategory", () => {
    it("delete_category_with_assets_blocked_409", async () => {
      vi.mocked(prisma.asset_categories.findUnique).mockResolvedValue({ id: 1, name: "Laptops" } as any);
      vi.mocked(prisma.assets.count).mockResolvedValue(2);

      await expect(
        categoryService.deleteCategory(1)
      ).rejects.toThrow("Cannot delete category because it is in use by assets");
    });
  });

  describe("createCustomField", () => {
    it("add_custom_field_duplicate_name_conflict", async () => {
      vi.mocked(prisma.asset_categories.findUnique).mockResolvedValue({ id: 1, name: "Laptops" } as any);
      vi.mocked(prisma.category_custom_fields.findUnique).mockResolvedValue({ id: 10, field_name: "RAM" } as any);

      await expect(
        categoryService.createCustomField(1, { field_name: "RAM", field_type: "text" })
      ).rejects.toThrow("Custom field name already exists in this category");
    });
  });
});
