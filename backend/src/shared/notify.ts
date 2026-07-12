import { prisma } from "./prisma.js";

export async function createNotification(
  userId: number,
  type: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: number,
): Promise<void> {
  try {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        type,
        message,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
