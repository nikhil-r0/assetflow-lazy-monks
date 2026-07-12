import { createApp } from "./app.js";
import { bookingService } from "./modules/operations/booking.service.js";

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

void runBookingJobs();
setInterval(() => {
  void runBookingJobs();
}, 60_000);
