/**
 * Express app factory.
 *
 * OWNERSHIP: Track A owns bootstrap long-term (auth mount, CORS from env, DB health).
 * Track B seeded this minimal shell so `/assets` can mount in parallel — A should
 * extend this file (not replace assets routes) when merging auth/org.
 */
import cors from "cors";
import express from "express";
import { assetsRouter } from "./modules/assets/assets.routes.js";
import { AppError } from "./shared/errors.js";
import { insightsRouter } from "./modules/insights/insights.routes.js";
import { dashboardRouter } from "./modules/insights/dashboard.routes.js";
import { auditRouter } from "./modules/insights/audit.routes.js";
import { reportsRouter } from "./modules/insights/reports.routes.js";
import { notifRouter } from "./modules/insights/notif.routes.js";
import { logsRouter } from "./modules/insights/logs.routes.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.get("/api/v1/health", (_req, res) => {
    // Track A: flip db:true once Prisma SELECT 1 is wired
    res.status(200).json({ status: "ok", db: false });
  });

  // Track B
  app.use("/api/v1/assets", assetsRouter);

  // Track D
  app.use("/api/v1/insights", insightsRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/audit-cycles", auditRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/notifications", notifRouter);
  app.use("/api/v1/activity-logs", logsRouter);

  // Track A: mount /auth, /departments, /categories, /users here
  // Track C: mount /bookings, /maintenance-requests

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof AppError) {
        res.status(err.httpStatus).json({
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        });
        return;
      }
      console.error(err);
      res.status(500).json({
        error: { code: "INTERNAL", message: "Unexpected error" },
      });
    },
  );

  return app;
}
