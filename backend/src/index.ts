import { createApp } from "./app.js";
import { bookingService } from "./modules/operations/booking.service.js";
import { flagOverdueAllocations } from "./modules/assets/overdue.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`AssetFlow API listening on http://localhost:${port}`);
});

/** Track C Phase 3/5 — time-based booking lifecycle + reminders (idempotent). */
async function runBookingJobs() {
  try {
    await bookingService.refreshStatus();
  } catch (err) {
    console.error("booking refresh-status failed", err);
  }
  try {
    await bookingService.emitReminders();
  } catch (err) {
    console.error("booking emit-reminders failed", err);
  }
}

/** Track B Phase 5 — mark past-due active allocations as overdue (idempotent). */
let overdueJobRunning = false;
async function runOverdueJob() {
  if (overdueJobRunning) return;
  overdueJobRunning = true;
  try {
    await flagOverdueAllocations(null);
  } catch (err) {
    console.error("allocations flag-overdue failed", err);
  } finally {
    overdueJobRunning = false;
  }
}

void runBookingJobs();
void runOverdueJob();
setInterval(() => {
  void runBookingJobs();
}, 60_000);
/** Spec: every 5 minutes; overlap guarded. */
setInterval(() => {
  void runOverdueJob();
}, 5 * 60_000);
