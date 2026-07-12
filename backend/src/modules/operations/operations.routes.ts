import { Router } from "express";

export const operationsRouter = Router();

/** Temporary health probe for Track C Phase 0 — remove after Phase 1 is live. */
operationsRouter.get("/ping", (_req, res) => {
  res.status(200).json({ module: "operations" });
});
