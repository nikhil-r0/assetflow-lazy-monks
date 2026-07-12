import { Router } from "express";

export const reportsRouter = Router();

// Skeleton route
reportsRouter.get("/asset-utilization", (_req, res) => {
  res.status(200).json({ message: "reports stub" });
});
