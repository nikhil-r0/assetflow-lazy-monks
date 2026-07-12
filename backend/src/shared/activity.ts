import { prisma } from "./prisma.js";

export async function logActivity(
  userId: number | null,
  action: string,
  entityType: string,
  entityId?: number,
  metadata?: any,
): Promise<void> {
  try {
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata || null,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
