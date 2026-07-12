import { z } from "zod";
import { DeptStatus, Role, UserStatus } from "@prisma/client";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  parent_department_id: z.number().int().positive().optional().nullable(),
  head_user_id: z.number().int().positive().optional().nullable(),
  status: z.nativeEnum(DeptStatus).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(120).optional(),
  parent_department_id: z.number().int().positive().nullable().optional(),
  head_user_id: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(DeptStatus).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  department_id: z.number().int().positive().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

