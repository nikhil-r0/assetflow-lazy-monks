/**
 * Screen 7 — Maintenance Management.
 * Raise requests + workflow actions by status (approve deferred asset flips to Phase 4).
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

type UiState = "idle" | "loading" | "error" | "success";

type MaintRow = {
  id: number;
  asset_id: number;
  issue_description: string;
  priority: string;
  status: string;
  technician_name?: string | null;
  resolved_at?: string | null;
  created_at: string;
};

const MANAGER_ACTIONS: Record<string, string[]> = {
  pending: ["approve", "reject"],
  approved: ["assign"],
  technician_assigned: ["start"],
  in_progress: ["resolve"],
};

export function MaintenancePage() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "asset_manager";

  const [assetId, setAssetId] = useState("");
  const [issue, setIssue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [photoUrl, setPhotoUrl] = useState("");
  const [technician, setTechnician] = useState("");
  const [rows, setRows] = useState<MaintRow[]>([]);
  const [listState, setListState] = useState<"loading" | "empty" | "error" | "ready">(
    "loading",
  );
  const [formState, setFormState] = useState<UiState>("idle");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");

  const loadList = useCallback(async () => {
    setListState("loading");
    try {
      const res = await apiClient.get<{ data: MaintRow[] }>("/maintenance-requests");
      const data = res.data.data ?? [];
      setRows(data);
      setListState(data.length === 0 ? "empty" : "ready");
    } catch {
      setListState("error");
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormState("loading");
    setMessage("");
    try {
      await apiClient.post("/maintenance-requests", {
        asset_id: Number(assetId),
        issue_description: issue,
        priority,
        photo_url: photoUrl || undefined,
      });
      setFormState("success");
      setMessageTone("ok");
      setMessage("Maintenance request raised (pending).");
      setIssue("");
      await loadList();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setFormState("error");
      setMessageTone("err");
      setMessage(ax.response?.data?.error?.message ?? "Failed to raise request.");
    }
  }

  async function runAction(id: number, action: string) {
    setMessage("");
    try {
      if (action === "assign") {
        const name =
          technician.trim() ||
          window.prompt("Technician name for this request?")?.trim() ||
          "";
        if (!name) {
          setMessageTone("err");
          setMessage("Assign needs a technician name.");
          return;
        }
        setTechnician(name);
        await apiClient.post(`/maintenance-requests/${id}/assign`, {
          technician_name: name,
        });
      } else if (action === "reject") {
        await apiClient.post(`/maintenance-requests/${id}/reject`, {});
      } else {
        await apiClient.post(`/maintenance-requests/${id}/${action}`);
      }
      setMessageTone("ok");
      setMessage(`Request #${id}: ${action} ok.`);
      await loadList();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setMessageTone("err");
      setMessage(ax.response?.data?.error?.message ?? `Failed to ${action}.`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 font-sans">
      <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
      <p className="mt-1 text-sm text-gray-500">
        Raise a request, then drive Pending → Approved → Assigned → In Progress → Resolved.
        Asset status flips land in Phase 4.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 grid gap-3 rounded border border-gray-200 bg-white p-4"
      >
        <label className="grid gap-1 text-sm">
          Asset id
          <input
            className="rounded border px-2 py-1"
            type="number"
            min={1}
            required
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Issue
          <textarea
            className="rounded border px-2 py-1"
            required
            maxLength={1000}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            rows={3}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Priority
          <select
            className="rounded border px-2 py-1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Photo URL (optional)
          <input
            className="rounded border px-2 py-1"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={formState === "loading"}
          className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {formState === "loading" ? "Submitting…" : "Raise request"}
        </button>
      </form>

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <h2 className="text-lg font-semibold">Requests</h2>
          {isManager && (
            <label className="grid gap-1 text-xs text-gray-600">
              Technician (for assign)
              <input
                className="rounded border px-2 py-1 text-sm"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Jane Tech"
              />
            </label>
          )}
        </div>

        {listState === "loading" && <p className="text-sm text-gray-500">Loading…</p>}
        {listState === "empty" && <p className="text-sm text-gray-500">No requests yet.</p>}
        {listState === "error" && (
          <p className="text-sm text-red-600">Failed to load requests.</p>
        )}
        {listState === "ready" && (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded border border-gray-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">#{r.id}</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{r.status}</span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                    {r.priority}
                  </span>
                  <span className="text-gray-500">asset {r.asset_id}</span>
                </div>
                <p className="mt-1 text-gray-800">{r.issue_description}</p>
                {r.technician_name && (
                  <p className="mt-1 text-xs text-gray-500">Tech: {r.technician_name}</p>
                )}
                {isManager && (MANAGER_ACTIONS[r.status] ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(MANAGER_ACTIONS[r.status] ?? []).includes("assign") && (
                      <input
                        className="rounded border px-2 py-1 text-xs"
                        value={technician}
                        onChange={(e) => setTechnician(e.target.value)}
                        placeholder="Technician name"
                        aria-label="Technician name for assign"
                      />
                    )}
                    {(MANAGER_ACTIONS[r.status] ?? []).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="rounded border px-2 py-1 text-xs capitalize hover:bg-gray-50"
                        onClick={() => void runAction(r.id, action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`mt-4 text-sm ${messageTone === "err" ? "text-red-600" : "text-green-700"}`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
