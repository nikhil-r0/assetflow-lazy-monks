import { describe, it, expect, vi, beforeEach } from "vitest";
import { orgService } from "./org.service.js";
import { prisma } from "../../prismaClient.js";
import { DeptStatus } from "@prisma/client";
import { AppError } from "../../shared/errors.js";

vi.mock("../../prismaClient.js", () => ({
  prisma: {
    departments: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("OrgService (Departments)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDepartment", () => {
    it("create_department_duplicate_name_conflict", async () => {
      vi.mocked(prisma.departments.findUnique).mockResolvedValue({ id: 1 } as any);
      await expect(
        orgService.createDepartment({ name: "Existing Dept" })
      ).rejects.toThrow("Department name already exists");
    });
  });

  describe("updateDepartment", () => {
    it("set_parent_to_self_rejected", async () => {
      vi.mocked(prisma.departments.findUnique).mockResolvedValue({ id: 5, name: "Dept" } as any);
      await expect(
        orgService.updateDepartment(5, { parent_department_id: 5 })
      ).rejects.toThrow("Department cannot be its own parent");
    });

    it("parent_cycle_detected_and_rejected", async () => {
      // Trying to set parent of 1 to 3.
      // But 3's parent is 2, and 2's parent is 1. (1 -> 2 -> 3 -> 1 cycle)
      vi.mocked(prisma.departments.findUnique).mockImplementation((args: any) => {
        if (args.where.id === 1) return Promise.resolve({ id: 1, name: "Dept 1" } as any);
        if (args.where.id === 3) return Promise.resolve({ id: 3, name: "Dept 3", parent_department_id: 2 } as any);
        if (args.where.id === 2) return Promise.resolve({ id: 2, name: "Dept 2", parent_department_id: 1 } as any);
        return Promise.resolve(null);
      });

      await expect(
        orgService.updateDepartment(1, { parent_department_id: 3 })
      ).rejects.toThrow("Circular hierarchy detected");
    });

    it("assign_head_user_persists", async () => {
      vi.mocked(prisma.departments.findUnique).mockImplementation((args: any) => {
        if (args.where.id === 10) return Promise.resolve({ id: 10, name: "HR" } as any);
        return Promise.resolve(null);
      });
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 42, name: "Alice" } as any);
      vi.mocked(prisma.departments.update).mockResolvedValue({ id: 10, head_user_id: 42 } as any);

      const result = await orgService.updateDepartment(10, { head_user_id: 42 });

      expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(prisma.departments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { head_user_id: 42 },
      });
      expect(result.head_user_id).toBe(42);
    });
  });

  describe("softDeleteDepartment", () => {
    it("delete_department_soft_deactivates_not_removed", async () => {
      vi.mocked(prisma.departments.findUnique).mockResolvedValue({ id: 7, status: DeptStatus.active } as any);
      vi.mocked(prisma.departments.update).mockResolvedValue({ id: 7, status: DeptStatus.inactive } as any);

      await orgService.softDeleteDepartment(7);

      expect(prisma.departments.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { status: DeptStatus.inactive },
      });
    });
  });

  describe("Users (Directory)", () => {
    it("admin_cannot_change_own_role_422", async () => {
      await expect(
        orgService.updateUserRole(1, "asset_manager" as any, 1)
      ).rejects.toThrow("Cannot change your own role");
    });

    it("promote_employee_to_asset_manager", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 2, role: "employee" } as any);
      vi.mocked(prisma.users.update).mockResolvedValue({ id: 2, role: "asset_manager" } as any);

      const result = await orgService.updateUserRole(2, "asset_manager" as any, 1);

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { role: "asset_manager" },
        select: expect.any(Object),
      });
      expect(result.role).toBe("asset_manager");
    });
  });
});

