import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import {
  ArrowLeft,
  Calendar,
  Building,
  MapPin,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { apiClient } from "../../api/client";

export default function AuditCycle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newAuditorId, setNewAuditorId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [itemNotes, setItemNotes] = useState<Record<number, string>>({});

  const cycleId = Number(id);
  const isManager = user?.role === "admin" || user?.role === "asset_manager";

  // 1. Fetch audit cycle details
  const { data: cycle, isLoading, error } = useQuery({
    queryKey: ["auditCycle", cycleId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/audit-cycles/${cycleId}`);
      return res.data;
    },
  });

  // 2. Fetch discrepancy report (only if closed)
  const { data: discrepancyReport } = useQuery({
    queryKey: ["discrepancyReport", cycleId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/audit-cycles/${cycleId}/discrepancy-report`);
      return res.data;
    },
    enabled: cycle?.status === "closed",
  });

  // 3. Fetch all users for assignment dropdown
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any[]>("/users");
        return res.data;
      } catch {
        return []; // Fallback
      }
    },
  });

  // 4. Assign auditor mutation
  const assignMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.post(`/audit-cycles/${cycleId}/auditors`, { auditor_user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditCycle", cycleId] });
      setNewAuditorId("");
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || "Failed to assign auditor");
    },
  });

  // 5. Remove auditor mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.delete(`/audit-cycles/${cycleId}/auditors/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditCycle", cycleId] });
    },
  });

  // 6. Verify item mutation (Phase 4)
  const verifyItemMutation = useMutation({
    mutationFn: async ({ itemId, result, notes }: { itemId: number; result: string; notes?: string }) => {
      await apiClient.patch(`/audit-items/${itemId}`, { result, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditCycle", cycleId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to verify item");
    },
  });

  // 7. Close cycle mutation (Phase 4)
  const closeCycleMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/audit-cycles/${cycleId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditCycle", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["discrepancyReport", cycleId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to close cycle");
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditorId) {
      setErrorMsg("Please select or enter a user ID");
      return;
    }
    assignMutation.mutate(Number(newAuditorId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Failed to load audit cycle</h2>
        <p className="text-sm text-gray-500 mt-1">
          {error ? "You may not have permissions to view this cycle." : "Audit cycle not found."}
        </p>
        <button
          onClick={() => navigate("/audit")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Audits
        </button>
      </div>
    );
  }

  const percent =
    cycle.summary.total > 0
      ? Math.round(((cycle.summary.total - cycle.summary.unchecked) / cycle.summary.total) * 100)
      : 0;

  const isClosed = cycle.status === "closed";

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 space-y-8 animate-fade-in">
      {/* Navigation & Title */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/audit")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-all cursor-pointer font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Audits
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">
              {cycle.name}
            </h1>
            {/* Meta scopes */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-mono">{new Date(cycle.start_date).toLocaleDateString()} – {new Date(cycle.end_date).toLocaleDateString()}</span>
              </span>
              {cycle.scope_location && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {cycle.scope_location}
                </span>
              )}
              {cycle.scope_department_id && cycle.department && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {cycle.department.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border font-mono ${
                isClosed ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {cycle.status}
            </span>

            {isManager && !isClosed && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to close this cycle? This will lock all verifications and mark missing assets as LOST.")) {
                    closeCycleMutation.mutate();
                  }
                }}
                disabled={closeCycleMutation.isPending}
                className="premium-btn-danger py-2 text-xs font-bold"
              >
                {closeCycleMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                Close Cycle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Summary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Progress gauge card */}
        <div className="premium-card p-6 flex flex-col justify-between lg:col-span-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Verification Progress
            </span>
            <div className="flex justify-between items-end mt-4 mb-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {percent}%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {cycle.summary.total - cycle.summary.unchecked} / {cycle.summary.total} Assets Verified
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          <div className="premium-card p-4 text-center flex flex-col justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 leading-none">{cycle.summary.verified}</span>
          </div>
          <div className="premium-card p-4 text-center flex flex-col justify-center hover:border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1.5" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 leading-none">{cycle.summary.missing}</span>
          </div>
          <div className="premium-card p-4 text-center flex flex-col justify-center hover:border-amber-200">
            <HelpCircle className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Damaged</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 leading-none">{cycle.summary.damaged}</span>
          </div>
        </div>
      </div>

      {/* Discrepancy report section if closed */}
      {isClosed && discrepancyReport && (
        <div className="bg-red-50/20 border border-red-200/60 rounded-2xl p-6 space-y-4 animate-fade-in">
          <h2 className="text-lg font-extrabold text-red-950 flex items-center gap-2.5 m-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Discrepancy Report Summary
          </h2>
          <p className="text-xs text-red-700/90 leading-relaxed font-medium">
            This cycle was closed. Below are the discrepancies identified during the audit. All items marked as "missing" have been set to status LOST.
          </p>

          {discrepancyReport.discrepancies.length === 0 ? (
            <div className="text-sm text-emerald-700 font-bold">Perfect Audit! No discrepancies found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discrepancyReport.discrepancies.map((d: any) => (
                <div key={d.audit_item_id} className="bg-white p-4 rounded-xl border border-red-150 shadow-2xs space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-purple-700">{d.asset_tag}</span>
                      <h4 className="text-xs font-bold text-slate-950 mt-0.5 line-clamp-1">{d.asset_name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${
                      d.result === "missing" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {d.result}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-100 font-medium">
                    <div>Notes: <span className="text-slate-700 font-bold">{d.notes || "None"}</span></div>
                    <div className="mt-1 font-mono">Verified by {d.verified_by} at {new Date(d.verified_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items snapshot table */}
        <div className="premium-card p-6 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 m-0">
            Assets Snapshot List
          </h2>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Asset Tag</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Snapshot Status</th>
                  <th className="p-4">Audit Status</th>
                  {!isClosed && <th className="p-4 text-right">Verification Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {cycle.items.length > 0 ? (
                  cycle.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-mono text-xs font-bold text-purple-700">
                        {item.asset.asset_tag}
                      </td>
                      <td className="p-4 font-bold text-slate-950">
                        {item.asset.name}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.asset.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        {item.result ? (
                          <div className="space-y-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border font-mono ${
                                item.result === "verified"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                                  : item.result === "missing"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                                {item.result}
                            </span>
                            {item.notes && <p className="text-[10px] text-slate-400 max-w-[150px] truncate font-medium">{item.notes}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-medium">Unchecked</span>
                        )}
                      </td>
                      {!isClosed && (
                        <td className="p-4 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={itemNotes[item.id] || ""}
                              onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg max-w-[120px] focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 bg-white"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "verified", notes: itemNotes[item.id] })}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "damaged", notes: itemNotes[item.id] })}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-750 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                              >
                                Damaged
                              </button>
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "missing", notes: itemNotes[item.id] })}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95"
                              >
                                Missing
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium">
                      No assets in scope for this audit cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor Management Panel */}
        <div className="premium-card p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 m-0 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-450" />
              Auditors
            </h2>

            {/* List assigned auditors */}
            <div className="space-y-2.5">
              {cycle.auditors.length > 0 ? (
                cycle.auditors.map((auditor: any) => (
                  <div
                    key={auditor.id}
                    className="p-3 border border-slate-100 hover:border-purple-100 rounded-xl flex justify-between items-center bg-slate-50/30 transition-all duration-200"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-950">
                        {auditor.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {auditor.email}
                      </p>
                    </div>
                    {!isClosed && (
                      <button
                        onClick={() => removeMutation.mutate(auditor.id)}
                        className="p-1.5 text-slate-400 hover:text-red-650 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic font-medium">
                  No auditors assigned yet. Cycle creator must assign auditors.
                </p>
              )}
            </div>
          </div>

          {/* Form to assign a new auditor */}
          {!isClosed && (
            <form onSubmit={handleAssign} className="border-t border-slate-100 pt-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-150">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="premium-input-label">Assign Auditor</label>
                <div className="flex gap-2">
                  {users && users.length > 0 ? (
                    <select
                      value={newAuditorId}
                      onChange={(e) => setNewAuditorId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 bg-white cursor-pointer font-sans"
                    >
                      <option value="">Select Auditor...</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      placeholder="Enter Auditor User ID"
                      value={newAuditorId}
                      onChange={(e) => setNewAuditorId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="premium-btn-primary py-2 px-3 shadow-sm hover:shadow-md"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <span className="premium-input-hint">
                  * Assigned auditors will receive notifications and verify scoped items.
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
