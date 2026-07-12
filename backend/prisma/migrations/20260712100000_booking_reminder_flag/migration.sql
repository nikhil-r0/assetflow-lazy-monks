-- Track C Phase 5: reminder idempotency flag
ALTER TABLE "bookings" ADD COLUMN "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
