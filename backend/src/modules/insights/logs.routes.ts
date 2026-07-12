import { Router } from "express";
import { requireAuth } from "../../shared/auth.js";
import { logsService } from "./logs.service.js";

export const logsRouter = Router();

// Apply auth to all log routes
logsRouter.use(requireAuth);

// GET /activity-logs
logsRouter.get("/", async (req, res, next) => {
  try {
    const actingUser = req.user!;
    const filters = {
      entity_type: req.query.entity_type as string | undefined,
      entity_id: req.query.entity_id ? Number(req.query.entity_id) : undefined,
      user_id: req.query.user_id ? Number(req.query.user_id) : undefined,
      action: req.query.action as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };

    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 10;

    const result = await logsService.list(actingUser, filters, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
