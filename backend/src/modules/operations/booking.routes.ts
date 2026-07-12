import { Router } from "express";
import { Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import { createBookingSchema, listBookingsQuerySchema } from "./booking.schema.js";
import { bookingService } from "./booking.service.js";

export const bookingRouter = Router();

bookingRouter.post(
  "/",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager, Role.department_head, Role.employee),
  async (req, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("VALIDATION_ERROR", 422, "Invalid booking body", [
          ...parsed.error.issues.map((i) => ({
            field: i.path.join(".") || "body",
            issue: i.message,
          })),
        ]);
      }
      const booking = await bookingService.create(parsed.data, req.user!.id);
      res.status(201).json(booking);
    } catch (err) {
      next(err);
    }
  },
);

bookingRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const parsed = listBookingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid query", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "query",
          issue: i.message,
        })),
      ]);
    }
    const result = await bookingService.list(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
