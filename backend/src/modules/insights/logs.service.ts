import { prisma } from "../../shared/prisma.js";
import { Role } from "../../shared/enums.js";

export const logsService = {
  async list(
    actingUser: { id: number; role: Role; department_id: number | null },
    filters: {
      entity_type?: string;
      entity_id?: number;
      user_id?: number;
      action?: string;
      from?: string;
      to?: string;
    },
    page = 1,
    limit = 10,
  ) {
    const where: any = {};

    // 1. Role-based scoping
    if (actingUser.role === Role.department_head) {
      if (actingUser.department_id) {
        where.user = {
          department_id: actingUser.department_id,
        };
      } else {
        // If department head doesn't have a dept, they see nothing
        where.id = -1;
      }
    } else if (actingUser.role === Role.employee) {
      where.user_id = actingUser.id;
    }
    // admin and asset_manager see all, so no restriction here.

    // 2. Apply query filters
    if (filters.entity_type) {
      where.entity_type = filters.entity_type;
    }
    if (filters.entity_id !== undefined) {
      where.entity_id = filters.entity_id;
    }
    if (filters.user_id !== undefined) {
      if (actingUser.role === Role.employee) {
        // Employee can only see their own logs
        where.user_id = actingUser.id;
      } else if (actingUser.role === Role.department_head) {
        // Department head can query a specific user but only if they belong to their department
        where.user_id = filters.user_id;
        where.user = {
          id: filters.user_id,
          department_id: actingUser.department_id,
        };
      } else {
        where.user_id = filters.user_id;
      }
    }
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) {
        where.created_at.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.created_at.lte = new Date(filters.to);
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.activity_logs.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.activity_logs.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  },
};
