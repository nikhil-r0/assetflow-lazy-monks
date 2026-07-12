/**
 * Screen 6 — Resource Booking (create form shell).
 * Wire calendar + TanStack Query once bookable assets API is live.
 */
import { useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";

type BookingState = "idle" | "loading" | "error" | "overlap" | "success";

export function BookingPage() {
  const [resourceAssetId, setResourceAssetId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [state, setState] = useState<BookingState>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      await apiClient.post("/bookings", {
        resource_asset_id: Number(resourceAssetId),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setState("success");
      setMessage("Booking created.");
    } catch (err: unknown) {
      const ax = err as {
        response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
      };
      const code = ax.response?.data?.error?.code;
      if (code === "OVERLAP" || ax.response?.status === 422) {
        setState("overlap");
        setMessage(
          ax.response?.data?.error?.message ??
            "That slot overlaps an existing booking.",
        );
      } else {
        setState("error");
        setMessage(ax.response?.data?.error?.message ?? "Failed to create booking.");
      }
    }
  }

  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif", maxWidth: 480 }}>
      <h1>Book a resource</h1>
      <p>Screen 6 — create a time-slot booking. Overlaps are rejected.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Resource asset id
          <input
            value={resourceAssetId}
            onChange={(e) => setResourceAssetId(e.target.value)}
            required
            type="number"
            min={1}
          />
        </label>
        <label>
          Start
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={state === "loading"}>
          {state === "loading" ? "Booking…" : "Book"}
        </button>
      </form>
      {message && (
        <p
          role="status"
          style={{
            color: state === "success" ? "green" : state === "overlap" ? "#b45309" : "crimson",
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}
