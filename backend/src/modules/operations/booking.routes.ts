import { Router } from "express";
import { Role } from "../../shared/enums.js";
import { AppError } from "../../shared/errors.js";
import { requireAuth, requireRole } from "../../shared/auth.js";
import {
  calendarQuerySchema,
  createBookingSchema,
  listBookingsQuerySchema,
  rescheduleBookingSchema,
} from "./booking.schema.js";
import { bookingService } from "./booking.service.js";

export const bookingRouter = Router();

function parseId(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError("VALIDATION_ERROR", 422, "Invalid id", [
      { field: "id", issue: "invalid" },
    ]);
  }
  return n;
}

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

bookingRouter.get("/calendar", requireAuth, async (req, res, next) => {
  try {
    const parsed = calendarQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid query", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "query",
          issue: i.message,
        })),
      ]);
    }
    const data = await bookingService.calendar(parsed.data);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

bookingRouter.post(
  "/refresh-status",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (_req, res, next) => {
    try {
      const result = await bookingService.refreshStatus();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

bookingRouter.post(
  "/emit-reminders",
  requireAuth,
  requireRole(Role.admin, Role.asset_manager),
  async (_req, res, next) => {
    try {
      const result = await bookingService.emitReminders();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

bookingRouter.post("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const row = await bookingService.cancel(parseId(req.params.id), {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.status(200).json(row);
  } catch (err) {
    next(err);
  }
});

bookingRouter.patch("/:id/reschedule", requireAuth, async (req, res, next) => {
  try {
    const parsed = rescheduleBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", 422, "Invalid body", [
        ...parsed.error.issues.map((i) => ({
          field: i.path.join(".") || "body",
          issue: i.message,
        })),
      ]);
    }
    const row = await bookingService.reschedule(parseId(req.params.id), parsed.data, {
      id: req.user!.id,
      role: req.user!.role,
    });
    res.status(200).json(row);
  } catch (err) {
    next(err);
  }
});
