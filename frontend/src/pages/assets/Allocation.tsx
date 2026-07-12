/**
 * Screen 5 — Allocation & Transfer.
 * Rule 1 money shot: 409 → Request Transfer → approve → history updates.
 */
import { useState, type FormEvent } from "react";
import { apiClient } from "../../api/client";

type TransferRow = {
  id: number;
  status: string;
  asset_id: number;
  to_user_id: number;
  from_user_id?: number | null;
};

export function AllocationPage() {
  const [assetId, setAssetId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function requestTransfer(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.post("/transfer-requests", {
        asset_id: Number(assetId),
        to_user_id: Number(toUserId),
      });
      setMessage("Transfer requested.");
      await refresh();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage(ax.response?.data?.error?.message ?? "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const res = await apiClient.get("/transfer-requests");
    setTransfers(res.data?.data ?? []);
  }

  async function approve(id: number) {
    setBusy(true);
    try {
      await apiClient.post(`/transfer-requests/${id}/approve`);
      setMessage(`Transfer #${id} approved — asset re-allocated.`);
      await refresh();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage(ax.response?.data?.error?.message ?? "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: number) {
    setBusy(true);
    try {
      await apiClient.post(`/transfer-requests/${id}/reject`, { reason: "Rejected" });
      setMessage(`Transfer #${id} rejected.`);
      await refresh();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage(ax.response?.data?.error?.message ?? "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Allocation & Transfer</h1>
      <p>
        After a double-allocation <strong>409</strong>, request a transfer here. Managers
        approve to re-allocate atomically.
      </p>

      <section style={{ marginTop: "1.5rem", maxWidth: 420 }}>
        <h2>Request transfer</h2>
        <form onSubmit={requestTransfer} style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Asset ID
            <input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              inputMode="numeric"
            />
          </label>
          <label>
            To user ID
            <input
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              required
              inputMode="numeric"
            />
          </label>
          <button type="submit" disabled={busy}>
            Request Transfer
          </button>
        </form>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Transfer requests</h2>
        <button type="button" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
        <ul>
          {transfers.map((t) => (
            <li key={t.id} style={{ marginTop: "0.5rem" }}>
              #{t.id} asset={t.asset_id} → user {t.to_user_id} [{t.status}]
              {t.status === "requested" && (
                <>
                  {" "}
                  <button type="button" disabled={busy} onClick={() => void approve(t.id)}>
                    Approve
                  </button>{" "}
                  <button type="button" disabled={busy} onClick={() => void reject(t.id)}>
                    Reject
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {message && <p style={{ color: "#444" }}>{message}</p>}
    </main>
  );
}
