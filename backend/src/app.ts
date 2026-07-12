import cors from "cors";
import express from "express";

import { prisma } from "./prismaClient.js";
import { errorHandler } from "./shared/errors.js";

// Track B
import { assetsRouter } from "./modules/assets/assets.routes.js";

// Track C
import { bookingRouter } from "./modules/operations/booking.routes.js";
import { maintRouter } from "./modules/operations/maint.routes.js";
import { operationsRouter } from "./modules/operations/operations.routes.js";

// Track D
import { insightsRouter } from "./modules/insights/insights.routes.js";
import { dashboardRouter } from "./modules/insights/dashboard.routes.js";
import { auditRouter } from "./modules/insights/audit.routes.js";
import { reportsRouter } from "./modules/insights/reports.routes.js";
import { notifRouter } from "./modules/insights/notif.routes.js";
import { logsRouter } from "./modules/insights/logs.routes.js";

/**
 * Express app factory (used by tests + index.ts).
 * Track A owns long-term bootstrap; C mounts bookings/maintenance here.
 */
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
    }),
  );

  app.use(express.json());

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Track A Routes (pending)
  // app.use("/api/v1/auth", authRoutes);
  // app.use("/api/v1/departments", departmentRoutes);
  // app.use("/api/v1/categories", categoryRoutes);
  // app.use("/api/v1/users", userRoutes);

  // Track B
  app.use("/api/v1/assets", assetsRouter);

  // Track C
  app.use("/api/v1/operations", operationsRouter);
  app.use("/api/v1/bookings", bookingRouter);
  app.use("/api/v1/maintenance-requests", maintRouter);

  // Track D
  app.use("/api/v1/insights", insightsRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/audit-cycles", auditRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/notifications", notifRouter);
  app.use("/api/v1/activity-logs", logsRouter);

  app.get("/api/v1/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", db: true });
    } catch {
      res.status(500).json({ status: "error", db: false });
    }
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
