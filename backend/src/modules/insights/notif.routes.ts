import { Router } from "express";
import { requireAuth } from "../../shared/auth.js";
import { notifService } from "./notif.service.js";

export const notifRouter = Router();

// Apply auth to all notification routes
notifRouter.use(requireAuth);

// GET /notifications
notifRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const isReadParam = req.query.is_read;
    const isRead = isReadParam !== undefined ? isReadParam === "true" : undefined;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 10;

    const result = await notifService.list(userId, isRead, page, limit);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /notifications/unread-count
notifRouter.get("/unread-count", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await notifService.getUnreadCount(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /notifications/mark-all-read
notifRouter.post("/mark-all-read", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await notifService.markAllAsRead(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// PATCH /notifications/:id/read
notifRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const result = await notifService.markAsRead(userId, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
