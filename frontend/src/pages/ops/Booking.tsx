/**
 * Screen 6 — Resource Booking (create + calendar + cancel/reschedule).
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import { BookingCalendar, type CalendarBooking } from "../../components/BookingCalendar";

type BookingState = "idle" | "loading" | "error" | "overlap" | "success";

export function BookingPage() {
  const [resourceAssetId, setResourceAssetId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [state, setState] = useState<BookingState>("idle");
  const [message, setMessage] = useState("");
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [calState, setCalState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);

  const loadCalendar = useCallback(async (assetId: number) => {
    setCalState("loading");
    try {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const res = await apiClient.get<CalendarBooking[]>("/bookings/calendar", {
        params: {
          resource_asset_id: assetId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      });
      setBookings(res.data);
      setCalState("ready");
    } catch {
      setCalState("error");
    }
  }, []);

  useEffect(() => {
    const id = Number(resourceAssetId);
    if (Number.isInteger(id) && id > 0) {
      void loadCalendar(id);
    }
  }, [resourceAssetId, loadCalendar]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const body = {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };
      if (rescheduleId != null) {
        await apiClient.patch(`/bookings/${rescheduleId}/reschedule`, body);
        setRescheduleId(null);
        setState("success");
        setMessage(`Booking #${rescheduleId} rescheduled.`);
      } else {
        await apiClient.post("/bookings", {
          resource_asset_id: Number(resourceAssetId),
          ...body,
        });
        setState("success");
        setMessage("Booking created.");
      }
      const id = Number(resourceAssetId);
      if (id > 0) await loadCalendar(id);
    } catch (err: unknown) {
      const ax = err as {
        response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
      };
      const code = ax.response?.data?.error?.code;
      if (code === "OVERLAP") {
        setState("overlap");
        setMessage(
          ax.response?.data?.error?.message ??
            "That slot overlaps an existing booking.",
        );
      } else {
        setState("error");
        setMessage(ax.response?.data?.error?.message ?? "Failed to save booking.");
      }
    }
  }

  async function onCancel(id: number) {
    try {
      await apiClient.post(`/bookings/${id}/cancel`);
      setMessage(`Booking #${id} cancelled.`);
      setState("success");
      const assetId = Number(resourceAssetId);
      if (assetId > 0) await loadCalendar(assetId);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setState("error");
      setMessage(ax.response?.data?.error?.message ?? "Cancel failed.");
    }
  }

  const assetIdNum = Number(resourceAssetId);

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <h1 className="text-2xl font-bold text-gray-900">Book a resource</h1>
      <p className="mt-1 text-sm text-gray-500">
        Create, cancel, or reschedule. Overlaps are rejected (half-open intervals).
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 grid gap-3 rounded border border-gray-200 bg-white p-4"
      >
        <label className="grid gap-1 text-sm">
          Resource asset id
          <input
            className="rounded border px-2 py-1"
            value={resourceAssetId}
            onChange={(e) => setResourceAssetId(e.target.value)}
            required
            type="number"
            min={1}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Start
          <input
            className="rounded border px-2 py-1"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          End
          <input
            className="rounded border px-2 py-1"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>
        {rescheduleId != null && (
          <p className="text-xs text-amber-700">
            Rescheduling booking #{rescheduleId}.{" "}
            <button type="button" className="underline" onClick={() => setRescheduleId(null)}>
              cancel reschedule
            </button>
          </p>
        )}
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {state === "loading"
            ? "Saving…"
            : rescheduleId != null
              ? "Save reschedule"
              : "Book"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            state === "success"
              ? "text-green-700"
              : state === "overlap"
                ? "text-amber-700"
                : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {calState === "loading" && <p className="mt-4 text-sm text-gray-500">Loading calendar…</p>}
      {calState === "error" && (
        <p className="mt-4 text-sm text-red-600">Failed to load calendar.</p>
      )}
      {calState === "ready" && Number.isInteger(assetIdNum) && assetIdNum > 0 && (
        <BookingCalendar
          resourceAssetId={assetIdNum}
          bookings={bookings}
          onEmptySlotClick={(s, e) => {
            setStartTime(s.slice(0, 16));
            setEndTime(e.slice(0, 16));
          }}
          onCancel={(id) => void onCancel(id)}
          onReschedule={(id) => {
            const b = bookings.find((x) => x.id === id);
            setRescheduleId(id);
            if (b) {
              setStartTime(b.start_time.slice(0, 16));
              setEndTime(b.end_time.slice(0, 16));
            }
          }}
        />
      )}
    </main>
  );
}
