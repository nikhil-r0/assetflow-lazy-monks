import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email").max(160),
  password: z.string().min(8, "Password must be at least 8 characters").max(255),
  department_id: z.number().int().positive().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
