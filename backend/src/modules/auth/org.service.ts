import { DeptStatus, Prisma, Role, UserStatus } from "@prisma/client";
import { prisma } from "../../prismaClient.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { buildEnvelope, parsePagination } from "../../shared/pagination.js";

export class OrgService {
  async createDepartment(data: {
    name: string;
    parent_department_id?: number | null;
    head_user_id?: number | null;
    status?: DeptStatus;
  }) {
    // Check name collision
    const existing = await prisma.departments.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new AppError("CONFLICT", 409, "Department name already exists");
    }

    if (data.parent_department_id) {
      const parent = await prisma.departments.findUnique({
        where: { id: data.parent_department_id },
      });
      if (!parent) {
        throw new AppError("UNPROCESSABLE", 422, "Parent department does not exist");
      }
    }

    if (data.head_user_id) {
      const head = await prisma.users.findUnique({
        where: { id: data.head_user_id },
      });
      if (!head) {
        throw new AppError("UNPROCESSABLE", 422, "Head user does not exist");
      }
    }

    const dept = await prisma.departments.create({
      data: {
        name: data.name,
        parent_department_id: data.parent_department_id || null,
        head_user_id: data.head_user_id || null,
        status: data.status || DeptStatus.active,
      },
    });

    return dept;
  }

  async getDepartments(query: any) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: Prisma.departmentsWhereInput = {};
    if (query.status) {
      where.status = query.status as DeptStatus;
    }

    const [items, total] = await Promise.all([
      prisma.departments.findMany({
        where,
        skip,
        take,
        include: {
          head_user: { select: { id: true, name: true } },
          parent_department: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.departments.count({ where }),
    ]);

    return buildEnvelope(items, total, page, pageSize);
  }

  async getDepartmentById(id: number) {
    const dept = await prisma.departments.findUnique({
      where: { id },
      include: {
        head_user: { select: { id: true, name: true } },
        parent_department: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    });

    if (!dept) {
      throw new NotFoundError("Department not found");
    }

    // Standardize _count format to match spec "member count" if needed, though raw is fine
    return {
      ...dept,
      memberCount: dept._count.users,
      _count: undefined,
    };
  }

  async updateDepartment(
    id: number,
    data: {
      name?: string;
      parent_department_id?: number | null;
      head_user_id?: number | null;
      status?: DeptStatus;
    }
  ) {
    const dept = await prisma.departments.findUnique({ where: { id } });
    if (!dept) {
      throw new NotFoundError("Department not found");
    }

    if (data.name && data.name !== dept.name) {
      const existing = await prisma.departments.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new AppError("CONFLICT", 409, "Department name already exists");
      }
    }

    if (data.parent_department_id !== undefined && data.parent_department_id !== null) {
      if (data.parent_department_id === id) {
        throw new AppError("UNPROCESSABLE", 422, "Department cannot be its own parent");
      }

      const parent = await prisma.departments.findUnique({
        where: { id: data.parent_department_id },
      });
      if (!parent) {
        throw new AppError("UNPROCESSABLE", 422, "Parent department does not exist");
      }

      // Cycle prevention algorithm
      let currentParentId: number | null = data.parent_department_id;
      let depth = 0;
      while (currentParentId && depth < 50) {
        if (currentParentId === id) {
          throw new AppError("UNPROCESSABLE", 422, "Circular hierarchy detected");
        }
        const currentParent: { parent_department_id: number | null } | null =
          await prisma.departments.findUnique({
            where: { id: currentParentId },
            select: { parent_department_id: true },
          });
        if (!currentParent) break;
        currentParentId = currentParent.parent_department_id;
        depth++;
      }
      if (depth >= 50) {
         throw new AppError("UNPROCESSABLE", 422, "Hierarchy depth exceeded");
      }
    }

    if (data.head_user_id) {
      const head = await prisma.users.findUnique({
        where: { id: data.head_user_id },
      });
      if (!head) {
        throw new AppError("UNPROCESSABLE", 422, "Head user does not exist");
      }
    }

    const updated = await prisma.departments.update({
      where: { id },
      data,
    });

    return updated;
  }

  async softDeleteDepartment(id: number) {
    const dept = await prisma.departments.findUnique({ where: { id } });
    if (!dept) {
      throw new NotFoundError("Department not found");
    }

    await prisma.departments.update({
      where: { id },
      data: { status: DeptStatus.inactive },
    });
  }

  // --- User / Directory Logic (Phase 4) ---

  async getUsers(query: any) {
    const { page, pageSize, skip, take } = parsePagination(query);

    const where: Prisma.usersWhereInput = {};
    if (query.role) where.role = query.role as Role;
    if (query.department_id) where.department_id = parseInt(query.department_id, 10);
    if (query.status) where.status = query.status as any;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department_id: true,
          status: true,
          created_at: true,
          department: { select: { id: true, name: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.users.count({ where }),
    ]);

    return buildEnvelope(items, total, page, pageSize);
  }

  async getAssignableHeads() {
    return prisma.users.findMany({
      where: {
        status: UserStatus.active,
        role: { in: [Role.admin, Role.asset_manager, Role.department_head, Role.employee] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department_id: true,
      },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  async updateUserRole(id: number, newRole: Role, currentUserId: number) {
    if (id === currentUserId) {
      throw new AppError("UNPROCESSABLE", 422, "Cannot change your own role");
    }

    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const updated = await prisma.users.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department_id: true,
        status: true,
        created_at: true,
      },
    });

    return updated;
  }

  async updateUser(
    id: number,
    data: { name?: string; department_id?: number | null; status?: any }
  ) {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (data.department_id) {
      const dept = await prisma.departments.findUnique({
        where: { id: data.department_id },
      });
      if (!dept) {
        throw new AppError("UNPROCESSABLE", 422, "Department does not exist");
      }
    }

    const updated = await prisma.users.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department_id: true,
        status: true,
        created_at: true,
      },
    });

    return updated;
  }
}

export const orgService = new OrgService();
