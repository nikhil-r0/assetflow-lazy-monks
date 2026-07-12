import { prisma } from "../../shared/prisma.js";
import { NotFoundError } from "../../shared/errors.js";

export const notifService = {
  async list(userId: number, isRead?: boolean, page = 1, limit = 10) {
    const where: any = { user_id: userId };
    if (isRead !== undefined) {
      where.is_read = isRead;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  },

  async markAsRead(userId: number, id: number) {
    const notification = await prisma.notifications.findUnique({
      where: { id },
    });

    if (!notification || notification.user_id !== userId) {
      throw new NotFoundError("Notification not found or access denied");
    }

    const updated = await prisma.notifications.update({
      where: { id },
      data: { is_read: true },
    });

    return updated;
  },

  async markAllAsRead(userId: number) {
    const { count } = await prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return { updated: count };
  },

  async getUnreadCount(userId: number) {
    const count = await prisma.notifications.count({
      where: { user_id: userId, is_read: false },
    });

    return { count };
  },
};
