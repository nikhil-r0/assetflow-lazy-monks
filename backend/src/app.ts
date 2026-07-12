import express from "express";
import cors from "cors";

import { prisma } from "./prismaClient.js";
import { errorHandler } from "./shared/errors.js";

// Track A
import { authRoutes } from "./modules/auth/auth.routes.js";

// Track B
import { assetsRouter } from "./modules/assets/assets.routes.js";

// Track D
import { insightsRouter } from "./modules/insights/insights.routes.js";
import { dashboardRouter } from "./modules/insights/dashboard.routes.js";
import { auditRouter } from "./modules/insights/audit.routes.js";
import { reportsRouter } from "./modules/insights/reports.routes.js";
import { notifRouter } from "./modules/insights/notif.routes.js";
import { logsRouter } from "./modules/insights/logs.routes.js";

export const app = express();
export const createApp = () => app;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);

app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ----------------------
// Track A Routes
// ----------------------
app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/departments", departmentRoutes);
// app.use("/api/v1/categories", categoryRoutes);
// app.use("/api/v1/users", userRoutes);

// ----------------------
// Track B Routes
// ----------------------
app.use("/api/v1/assets", assetsRouter);

// ----------------------
// Track C Routes
// ----------------------
// app.use("/api/v1/bookings", bookingRoutes);
// app.use("/api/v1/maintenance-requests", maintenanceRoutes);

// ----------------------
// Track D Routes
// ----------------------
app.use("/api/v1/insights", insightsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/audit-cycles", auditRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/notifications", notifRouter);
app.use("/api/v1/activity-logs", logsRouter);

// Health check
app.get("/api/v1/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      db: true,
    });
  } catch {
    res.status(500).json({
      status: "error",
      db: false,
    });
  }
});

// Global error handler (must be last)
app.use(errorHandler);