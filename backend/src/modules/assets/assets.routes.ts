import { Router } from "express";

export const assetsRouter = Router();

/** Temporary health probe for Track B Phase 0 — remove after Phase 1. */
assetsRouter.get("/ping", (_req, res) => {
  res.status(200).json({ module: "assets" });
});
