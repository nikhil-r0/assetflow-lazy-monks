import { Router } from "express";

export const dashboardRouter = Router();

// Skeleton route
dashboardRouter.get("/kpis", (_req, res) => {
  res.status(200).json({ message: "kpis stub" });
});
