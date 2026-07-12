import { Router } from "express";
import { AuthService } from "./auth.service.js";
import { signupSchema, loginSchema } from "./auth.schema.js";
import { requireAuth } from "../../shared/auth.js";
import { AppError } from "../../shared/errors.js";

export const authRoutes = Router();
const authService = new AuthService();

authRoutes.post("/signup", async (req, res, next) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", (parseResult.error as any).issues);
    }
    const user = await authService.signup(parseResult.data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

authRoutes.post("/login", async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Validation failed", (parseResult.error as any).issues);
    }
    const result = await authService.login(parseResult.data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

authRoutes.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});
