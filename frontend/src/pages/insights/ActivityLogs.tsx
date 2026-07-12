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
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Activity Audits & Logs</h1>
            <p className="text-sm text-gray-500 mt-1">Track platform-wide events, changes, and security operations</p>
          </div>
        </div>

        {/* Filter Form */}
        <form
          onSubmit={handleSearch}
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-800 m-0">Search Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Action
              </label>
              <input
                type="text"
                placeholder="e.g. ACT.CREATE_ASSET"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Entity Type
              </label>
              <input
                type="text"
                placeholder="e.g. asset"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Entity ID
              </label>
              <input
                type="number"
                placeholder="ID"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                User ID
              </label>
              <input
                type="number"
                placeholder="Actor ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Search className="mr-2 h-4 w-4" /> Filter Logs
            </button>
          </div>
        </form>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50/70 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100">
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
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <Loader2 className="h-7 w-7 text-purple-500 animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No activity logs found matching the filters
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{log.id}</td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div>
                            <p className="font-medium text-gray-800">{log.user.name}</p>
                            <span className="text-xs text-gray-400">
                              ID {log.user_id} • {log.user.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">{log.entity_type}</td>
                      <td className="px-6 py-4">{log.entity_id || "-"}</td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.metadata ? (
                          <button
                            onClick={() => setSelectedMetadata(log.metadata)}
                            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium cursor-pointer"
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
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Showing page {page} of {totalPages} ({totalCount} entries)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 m-0">Metadata Viewer</h3>
            <pre className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs overflow-auto max-h-96">
              {JSON.stringify(selectedMetadata, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMetadata(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer"
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
