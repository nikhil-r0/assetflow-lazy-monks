/**
 * Screen 4 — Asset Registration & Directory.
 */
import { useCallback, useEffect, useState, Fragment } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

type AssetRow = {
  id: number;
  asset_tag: string;
  name: string;
  status: string;
  location: string | null;
  is_bookable: boolean;
  category?: { id: number; name: string } | null;
};

type HistoryPayload = {
  allocations: Array<{
    id: number;
    status: string;
    allocated_date: string;
    employee?: { name: string } | null;
    department?: { name: string } | null;
  }>;
  maintenance: Array<{ id: number; status: string; created_at: string }>;
};

const STATUSES = [
  "Available",
  "Allocated",
  "Reserved",
  "Under_Maintenance",
  "Lost",
  "Retired",
  "Disposed",
] as const;

function statusClass(status: string) {
  switch (status) {
    case "Available":
      return "bg-emerald-50 text-emerald-700";
    case "Allocated":
      return "bg-blue-50 text-blue-700";
    case "Reserved":
      return "bg-violet-50 text-violet-700";
    case "Under_Maintenance":
      return "bg-amber-50 text-amber-800";
    case "Lost":
      return "bg-rose-50 text-rose-700";
    case "Retired":
    case "Disposed":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

function errMsg(err: unknown) {
  const ax = err as { response?: { data?: { error?: { message?: string } } } };
  return ax.response?.data?.error?.message ?? "Request failed";
}

export function RegistryPage() {
  const { user } = useAuth();
  const canRegister =
    user?.role === "admin" || user?.role === "asset_manager";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/assets", {
        params: {
          page: 1,
          pageSize: 50,
          q: q.trim() || undefined,
          status: status || undefined,
        },
      });
      setRows(res.data?.data ?? []);
      setTotal(res.data?.pagination?.total ?? 0);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openHistory(id: number) {
    if (selectedId === id) {
      setSelectedId(null);
      setHistory(null);
      return;
    }
    setSelectedId(id);
    setHistoryLoading(true);
    setHistory(null);
    try {
      const res = await apiClient.get(`/assets/${id}/history`);
      setHistory(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Registry</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search, filter, and inspect lifecycle history ({total} assets).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {canRegister && (
            <Link
              to="/assets/new"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Register asset
            </Link>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tag, name, serial…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-300"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading assets…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No assets found. {canRegister ? "Register the first one." : ""}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Bookable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => void openHistory(row.id)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-purple-700">
                      {row.asset_tag}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                      >
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.is_bookable ? "Yes" : "No"}
                    </td>
                  </tr>
                  {selectedId === row.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-4 py-4">
                        {historyLoading ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading history…
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Allocations
                              </h3>
                              {(history?.allocations?.length ?? 0) === 0 ? (
                                <p className="text-sm text-gray-500">None yet.</p>
                              ) : (
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {history!.allocations.map((a) => (
                                    <li key={a.id}>
                                      #{a.id} [{a.status}] —{" "}
                                      {a.employee?.name ??
                                        a.department?.name ??
                                        "unassigned"}{" "}
                                      · {new Date(a.allocated_date).toLocaleString()}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Maintenance
                              </h3>
                              {(history?.maintenance?.length ?? 0) === 0 ? (
                                <p className="text-sm text-gray-500">None yet.</p>
                              ) : (
                                <ul className="space-y-1 text-sm text-gray-700">
                                  {history!.maintenance.map((m) => (
                                    <li key={m.id}>
                                      #{m.id} [{m.status}] ·{" "}
                                      {new Date(m.created_at).toLocaleString()}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
