/**
 * Screen 5 — Allocation & Transfer.
 * Rule 1 money shot: 409 → Request Transfer → approve → history updates.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

type TransferRow = {
  id: number;
  status: string;
  asset_id: number;
  to_user_id: number;
  from_user_id?: number | null;
};

function errPayload(err: unknown): {
  message: string;
  code?: string;
  holder?: string;
} {
  const ax = err as {
    response?: {
      data?: {
        error?: {
          code?: string;
          message?: string;
          details?: Array<{ holder_name?: string; issue?: string }>;
        };
      };
    };
  };
  const error = ax.response?.data?.error;
  const holder = error?.details?.find((d) => d.holder_name)?.holder_name;
  return {
    message: error?.message ?? "Request failed",
    code: error?.code,
    holder,
  };
}

export function AllocationPage() {
  const { user } = useAuth();
  const canAllocate =
    user?.role === "admin" ||
    user?.role === "asset_manager" ||
    user?.role === "department_head";
  const canReturn =
    user?.role === "admin" || user?.role === "asset_manager";
  const canFlagOverdue =
    user?.role === "admin" || user?.role === "asset_manager";

  const [allocAssetId, setAllocAssetId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [returnAllocId, setReturnAllocId] = useState("");

  const [assetId, setAssetId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [conflictHint, setConflictHint] = useState(false);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      const res = await apiClient.get("/transfer-requests");
      setTransfers(res.data?.data ?? []);
    } catch {
      /* ignore list errors on first paint */
    }
  }

  async function allocate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setConflictHint(false);
    try {
      const body: Record<string, unknown> = {
        asset_id: Number(allocAssetId),
      };
      if (employeeId.trim()) body.employee_id = Number(employeeId);
      if (departmentId.trim()) body.department_id = Number(departmentId);
      if (expectedReturn) body.expected_return_date = expectedReturn;

      const res = await apiClient.post("/allocations", body);
      setMessage(
        `Allocated #${res.data?.id} — asset ${res.data?.asset?.asset_tag ?? allocAssetId}.`,
      );
      setAllocAssetId("");
      setEmployeeId("");
      setDepartmentId("");
      setExpectedReturn("");
    } catch (err) {
      const p = errPayload(err);
      setMessage(
        p.holder ? `${p.message} (held by ${p.holder})` : p.message,
      );
      if (
        p.code === "CONFLICT" ||
        p.message.toLowerCase().includes("held by") ||
        p.holder
      ) {
        setConflictHint(true);
        setAssetId(allocAssetId);
      }
    } finally {
      setBusy(false);
    }
  }

  async function returnAllocation(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.post(`/allocations/${Number(returnAllocId)}/return`, {});
      setMessage(`Allocation #${returnAllocId} returned.`);
      setReturnAllocId("");
    } catch (err) {
      setMessage(errPayload(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestTransfer(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setConflictHint(false);
    try {
      await apiClient.post("/transfer-requests", {
        asset_id: Number(assetId),
        to_user_id: Number(toUserId),
      });
      setMessage("Transfer requested.");
      await refresh();
    } catch (err) {
      setMessage(errPayload(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: number) {
    setBusy(true);
    try {
      await apiClient.post(`/transfer-requests/${id}/approve`);
      setMessage(`Transfer #${id} approved — asset re-allocated.`);
      await refresh();
    } catch (err) {
      setMessage(errPayload(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: number) {
    setBusy(true);
    try {
      await apiClient.post(`/transfer-requests/${id}/reject`, {
        reason: "Rejected",
      });
      setMessage(`Transfer #${id} rejected.`);
      await refresh();
    } catch (err) {
      setMessage(errPayload(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function flagOverdue() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiClient.post("/allocations/flag-overdue");
      const flagged = res.data?.flagged ?? 0;
      setMessage(
        flagged === 0
          ? "No past-due allocations to flag."
          : `Flagged ${flagged} allocation(s) as overdue.`,
      );
    } catch (err) {
      setMessage(errPayload(err).message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100";
  const cardClass =
    "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm";

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Allocation & Transfer</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Allocate available assets, return them, or resolve double-allocation conflicts
        with a transfer.{" "}
        <Link to="/assets" className="text-purple-700 hover:underline">
          Open registry
        </Link>
      </p>

      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            conflictHint
              ? "border border-amber-200 bg-amber-50 text-amber-900"
              : "border border-gray-100 bg-white text-gray-700 shadow-sm"
          }`}
        >
          {message}
          {conflictHint && (
            <span className="mt-1 block font-medium">
              Use Request Transfer below to move the asset to another holder.
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {canAllocate && (
          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-gray-900">Allocate</h2>
            <p className="mt-1 text-xs text-gray-500">
              Exactly one of employee ID or department ID. Past return date demos overdue.
            </p>
            <form onSubmit={allocate} className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-gray-700">
                Asset ID
                <input
                  className={inputClass}
                  value={allocAssetId}
                  onChange={(e) => setAllocAssetId(e.target.value)}
                  required
                  inputMode="numeric"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Employee ID
                <input
                  className={inputClass}
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    if (e.target.value) setDepartmentId("");
                  }}
                  inputMode="numeric"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Department ID
                <input
                  className={inputClass}
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    if (e.target.value) setEmployeeId("");
                  }}
                  inputMode="numeric"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Expected return date
                <input
                  type="date"
                  className={inputClass}
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                Allocate
              </button>
            </form>
          </section>
        )}

        {canReturn && (
          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-gray-900">Return</h2>
            <p className="mt-1 text-xs text-gray-500">
              Closes an active/overdue allocation and frees the asset when possible.
            </p>
            <form onSubmit={returnAllocation} className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-gray-700">
                Allocation ID
                <input
                  className={inputClass}
                  value={returnAllocId}
                  onChange={(e) => setReturnAllocId(e.target.value)}
                  required
                  inputMode="numeric"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                Return asset
              </button>
            </form>
          </section>
        )}

        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-gray-900">Request transfer</h2>
          <p className="mt-1 text-xs text-gray-500">
            After a 409 conflict, request a transfer to the new holder.
          </p>
          <form onSubmit={requestTransfer} className="mt-4 grid gap-3">
            <label className="text-sm font-medium text-gray-700">
              Asset ID
              <input
                className={inputClass}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                required
                inputMode="numeric"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              To user ID
              <input
                className={inputClass}
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                required
                inputMode="numeric"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              Request Transfer
            </button>
          </form>
        </section>

        {canFlagOverdue && (
          <section className={cardClass}>
            <h2 className="text-lg font-semibold text-gray-900">Overdue flagging</h2>
            <p className="mt-1 text-xs text-gray-500">
              Marks active allocations with expected return strictly before today as
              overdue. Also runs every minute on the API.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void flagOverdue()}
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Flag overdue now
            </button>
          </section>
        )}
      </div>

      <section className={`${cardClass} mt-5`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Transfer requests</h2>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        {transfers.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No transfer requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="text-gray-800">
                  #{t.id} asset={t.asset_id} → user {t.to_user_id}{" "}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {t.status}
                  </span>
                </span>
                {t.status === "requested" && (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void approve(t.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void reject(t.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
