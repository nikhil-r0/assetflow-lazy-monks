/**
 * Prisma client singleton — frozen import path for Track B/C/D.
 *
 * BLOCKED: Prisma 7.x rejects `url = env("DATABASE_URL")` in schema.prisma.
 * Track A must move the URL to `prisma.config.ts` / adapter and run
 * `npx prisma generate`. Until then this module exports a typed placeholder.
 *
 * Frozen signature for DB-backed transitions (BUILD_SPEC I5):
 *   transitionStatus(assetId, to, actorId, reason?): Promise<Asset>
 */
export type PrismaClientPlaceholder = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

let warned = false;

function warnOnce(): void {
  if (warned) return;
  warned = true;
  console.warn(
    "[prismaClient] Prisma client not generated yet — Track A must fix schema datasource for Prisma 7, then run prisma generate.",
  );
}

export const prisma: PrismaClientPlaceholder = {
  async $connect() {
    warnOnce();
    throw new Error("Prisma client not available — run prisma generate after Track A datasource fix");
  },
  async $disconnect() {
    warnOnce();
  },
};
