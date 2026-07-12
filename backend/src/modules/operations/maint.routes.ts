import { Router } from "express";
import { NotImplementedError } from "../../shared/errors.js";

export const maintRouter = Router();

maintRouter.post("/", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests"));
});

maintRouter.get("/", (_req, _res, next) => {
  next(new NotImplementedError("GET /maintenance-requests"));
});

maintRouter.post("/:id/approve", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests/:id/approve"));
});

maintRouter.post("/:id/reject", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests/:id/reject"));
});

maintRouter.post("/:id/assign", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests/:id/assign"));
});

maintRouter.post("/:id/start", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests/:id/start"));
});

maintRouter.post("/:id/resolve", (_req, _res, next) => {
  next(new NotImplementedError("POST /maintenance-requests/:id/resolve"));
});
