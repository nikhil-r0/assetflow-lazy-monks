import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ArrowLeft, ArrowRight, ClipboardList, Eye } from "lucide-react";
import { apiClient } from "../../api/client";

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filter States
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    action: "",
    entityType: "",
    entityId: "",
    userId: "",
    from: "",
    to: "",
  });

  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);

  // 1. Fetch activity logs
  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", "list", appliedFilters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.action) params.append("action", appliedFilters.action);
      if (appliedFilters.entityType) params.append("entity_type", appliedFilters.entityType);
      if (appliedFilters.entityId) params.append("entity_id", appliedFilters.entityId);
      if (appliedFilters.userId) params.append("user_id", appliedFilters.userId);
      if (appliedFilters.from) params.append("from", appliedFilters.from);
      if (appliedFilters.to) params.append("to", appliedFilters.to);
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const res = await apiClient.get<{
        data: any[];
        total: number;
        page: number;
        limit: number;
      }>(`/activity-logs?${params.toString()}`);
      return res.data;
    },
  });

  const logs = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ action, entityType, entityId, userId, from, to });
  };

  const handleReset = () => {
    setAction("");
    setEntityType("");
    setEntityId("");
    setUserId("");
    setFrom("");
    setTo("");
    setPage(1);
    setAppliedFilters({ action: "", entityType: "", entityId: "", userId: "", from: "", to: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 animate-fade-in font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-650 rounded-xl border border-purple-100/50">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">Activity Audits &amp; Logs</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Track platform-wide events, changes, and security operations</p>
          </div>
        </div>

        {/* Filter Form */}
        <form
          onSubmit={handleSearch}
          className="premium-card p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 m-0">Search Filters</h2>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-purple-650 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="premium-input-label">Action</label>
              <input
                type="text"
                placeholder="e.g. ACT.CREATE_ASSET"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* Target action identifier.</span>
            </div>
            <div className="space-y-1">
              <label className="premium-input-label">Entity Type</label>
              <input
                type="text"
                placeholder="e.g. assets"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* Database table name.</span>
            </div>
            <div className="space-y-1">
              <label className="premium-input-label">Entity ID</label>
              <input
                type="number"
                placeholder="ID"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* Primary key of item.</span>
            </div>
            <div className="space-y-1">
              <label className="premium-input-label">User ID</label>
              <input
                type="number"
                placeholder="Actor ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* Primary key of actor.</span>
            </div>
            <div className="space-y-1">
              <label className="premium-input-label">From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* Start date bounds.</span>
            </div>
            <div className="space-y-1">
              <label className="premium-input-label">To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="premium-input text-xs"
              />
              <span className="premium-input-hint">* End date bounds.</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="premium-btn-primary py-2 px-4 shadow-sm"
            >
              <Search className="mr-1.5 h-4 w-4" /> Filter Logs
            </button>
          </div>
        </form>

        {/* Logs Table */}
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto border border-slate-100 rounded-xl m-4">
            <table className="w-full border-collapse text-left text-sm text-slate-500">
              <thead className="bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity Type</th>
                  <th className="px-6 py-4">Entity ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-sans text-slate-705">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <Loader2 className="h-7 w-7 text-purple-650 animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No activity logs found matching the filters
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">{log.id}</td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{log.user.name}</p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              ID {log.user_id} • {log.user.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-medium">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono bg-purple-50 text-purple-700 border-purple-150">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-xs font-mono">{log.entity_type}</td>
                      <td className="px-6 py-4 font-mono text-xs">{log.entity_id || "-"}</td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.metadata ? (
                          <button
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="inline-flex items-center gap-1.5 text-xs text-purple-650 hover:text-purple-800 font-bold cursor-pointer active:scale-95 transition-all"
                          >
                            <Eye className="h-4 w-4" /> View Details
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-white/50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono font-medium">
                Showing page {page} of {totalPages} ({totalCount} entries)
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-550 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-550 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition active:scale-95"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <h3 className="text-lg font-extrabold text-slate-900 m-0">Metadata Viewer</h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 text-xs overflow-auto max-h-96 font-mono">
              {JSON.stringify(selectedMetadata, null, 2)}
            </pre>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="premium-btn-primary py-2 px-4 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
