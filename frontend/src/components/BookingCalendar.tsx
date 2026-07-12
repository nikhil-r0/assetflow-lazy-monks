/**
 * Screen 6 — day strip calendar for one resource's bookings.
 */
export type CalendarBooking = {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
  booked_by_user_id: number;
};

const STATUS_COLOR: Record<string, string> = {
  upcoming: "#2563eb",
  ongoing: "#059669",
  completed: "#6b7280",
  cancelled: "#dc2626",
};

type Props = {
  resourceAssetId: number;
  bookings: CalendarBooking[];
  onEmptySlotClick?: (startLocal: string, endLocal: string) => void;
  onCancel?: (id: number) => void;
  onReschedule?: (id: number) => void;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingCalendar({
  resourceAssetId,
  bookings,
  onEmptySlotClick,
  onCancel,
  onReschedule,
}: Props) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00–19:00

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Calendar — asset #{resourceAssetId}
      </h2>
      <p className="text-xs text-gray-500">Click an empty hour to prefill the create form.</p>
      <div className="mt-3 grid gap-1">
        {hours.map((h) => {
          const slotStart = new Date();
          slotStart.setHours(h, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(h + 1, 0, 0, 0);
          const inSlot = bookings.filter((b) => {
            const s = new Date(b.start_time).getTime();
            const e = new Date(b.end_time).getTime();
            return s < slotEnd.getTime() && e > slotStart.getTime();
          });

          return (
            <div
              key={h}
              className="flex min-h-10 items-stretch gap-2 rounded border border-gray-200 bg-white"
            >
              <button
                type="button"
                className="w-16 shrink-0 border-r bg-gray-50 px-2 text-xs text-gray-600 hover:bg-gray-100"
                onClick={() =>
                  onEmptySlotClick?.(toLocalInput(slotStart.toISOString()), toLocalInput(slotEnd.toISOString()))
                }
              >
                {String(h).padStart(2, "0")}:00
              </button>
              <div className="flex flex-1 flex-wrap items-center gap-2 p-1">
                {inSlot.length === 0 && (
                  <span className="text-xs text-gray-400">free</span>
                )}
                {inSlot.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs text-white"
                    style={{ background: STATUS_COLOR[b.status] ?? "#4b5563" }}
                  >
                    <span>
                      #{b.id} {b.status}
                    </span>
                    {b.status === "upcoming" && (
                      <>
                        {onCancel && (
                          <button
                            type="button"
                            className="underline"
                            onClick={() => onCancel(b.id)}
                          >
                            cancel
                          </button>
                        )}
                        {onReschedule && (
                          <button
                            type="button"
                            className="underline"
                            onClick={() => onReschedule(b.id)}
                          >
                            reschedule
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
