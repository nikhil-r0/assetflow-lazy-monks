import { Router } from "express";
import { NotImplementedError } from "../../shared/errors.js";

export const bookingRouter = Router();

bookingRouter.post("/", (_req, _res, next) => {
  next(new NotImplementedError("POST /bookings"));
});

bookingRouter.get("/", (_req, _res, next) => {
  next(new NotImplementedError("GET /bookings"));
});
