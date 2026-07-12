import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  Loader2,
  Calendar,
  MapPin,
  Building,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { apiClient } from "../../api/client";

export default function Audit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scopeLocation, setScopeLocation] = useState("");
  const [scopeDeptId, setScopeDeptId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Query audit cycles
  const { data, isLoading } = useQuery({
    queryKey: ["auditCycles", statusFilter, page],
    queryFn: async () => {
      const params: any = { page, pageSize: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get<any>("/audit-cycles", { params });
      return res.data;
    },
  });

  // 2. Query departments for scoping dropdown
  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any[]>("/departments");
        return res.data;
      } catch {
        return []; // Fallback if departments endpoint not implemented/available
      }
    },
  });

  // 3. Create cycle mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/audit-cycles", payload);
      return res.data;
    },
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: ["auditCycles"] });
      setShowCreateModal(false);
      setName("");
      setStartDate("");
      setEndDate("");
      setScopeLocation("");
      setScopeDeptId("");
      setErrorMsg("");
      navigate(`/audit/${newCycle.id}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || "Failed to create audit cycle");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setErrorMsg("Name, start date, and end date are required");
      return;
    }
    createMutation.mutate({
      name,
      start_date: startDate,
      end_date: endDate,
      scope_location: scopeLocation || undefined,
      scope_department_id: scopeDeptId ? Number(scopeDeptId) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-purple-600" />
            Asset Audits
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Conduct inventory checks, verify equipment existence, and track compliance.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="premium-btn-primary py-2"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Cycle
        </button>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex items-center gap-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Filter Status:
        </span>
        <div className="flex gap-1.5">
          {["", "open", "closed"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-purple-50 text-purple-700 border border-purple-100"
                  : "text-slate-600 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {status || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Listing Grid */}
      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.data.map((cycle: any) => {
            const isClosed = cycle.status === "closed";
            const percent =
              cycle.progress.total > 0
                ? Math.round((cycle.progress.checked / cycle.progress.total) * 100)
                : 0;

            return (
              <div
                key={cycle.id}
                onClick={() => navigate(`/audit/${cycle.id}`)}
                className="premium-card p-6 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {cycle.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono ${
                        isClosed
                          ? "bg-slate-50 text-slate-500 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {cycle.status}
                    </span>
                  </div>

                  {/* Date information */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono">
                      {new Date(cycle.start_date).toLocaleDateString()} –{" "}
                      {new Date(cycle.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Scope details */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {cycle.scope_location && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                        <MapPin className="h-2.5 w-2.5 text-slate-400" />
                        {cycle.scope_location}
                      </span>
                    )}
                    {cycle.department && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                        <Building className="h-2.5 w-2.5 text-slate-400" />
                        {cycle.department.name}
                      </span>
                    )}
                    {!cycle.scope_location && !cycle.department && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-100 font-mono">
                        Global scope (all assets)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Audit Progress</span>
                    <span className="font-mono font-bold">
                      {cycle.progress.checked} / {cycle.progress.total} assets ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="premium-card py-16 text-center border-dashed">
          <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No audit cycles found</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">Get started by creating a new audit cycle.</p>
        </div>
      )}

      {/* Pagination controls */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg bg-white disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500 self-center">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">
              Create Audit Cycle
            </h2>
            <p className="text-xs text-slate-400 mb-6 font-medium">
              Specify scope to catalog and target in-scope assets instantly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-150">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="premium-input-label">Cycle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Inventory Audit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="premium-input"
                  required
                />
                <span className="premium-input-hint">
                  * Use a descriptive title, e.g. "Annual IT Audit" or "Q3 Lab Equipment Check".
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="premium-input-label">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="premium-input"
                    required
                  />
                  <span className="premium-input-hint">
                    * Beginning of verification period.
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="premium-input-label">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="premium-input"
                    required
                  />
                  <span className="premium-input-hint">
                    * Completion deadline.
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="premium-input-label">Location Scope (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Headquarters, remote"
                  value={scopeLocation}
                  onChange={(e) => setScopeLocation(e.target.value)}
                  className="premium-input"
                />
                <span className="premium-input-hint">
                  * Limit checks to assets at a specific branch or lab site (leave blank for all).
                </span>
              </div>

              <div className="space-y-1">
                <label className="premium-input-label">Department Scope (Optional)</label>
                <select
                  value={scopeDeptId}
                  onChange={(e) => setScopeDeptId(e.target.value)}
                  className="premium-input bg-white cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {depts?.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <span className="premium-input-hint">
                  * Limit checks to assets allocated to members of a specific department.
                </span>
              </div>

              <div className="flex gap-2.5 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="premium-btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="premium-btn-primary py-2"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Create Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
