import { Router } from "express";

export const auditRouter = Router();

// Skeleton route
auditRouter.get("/", (_req, res) => {
  res.status(200).json({ message: "audit-cycles stub" });
});
