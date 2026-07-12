import { Router } from "express";

export const insightsRouter = Router();

// GET /insights/ping -> 200 {module:"insights"}
insightsRouter.get("/ping", (_req, res) => {
  res.status(200).json({ module: "insights" });
});
