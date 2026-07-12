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
    <div className="min-h-screen bg-gray-50/50 p-6 sm:p-8 space-y-8">
      {/* Navigation & Title */}
      <div className="space-y-4">
        <button
          onClick={() => navigate("/audit")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Audits
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight m-0">
              {cycle.name}
            </h1>
            {/* Meta scopes */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(cycle.start_date).toLocaleDateString()} –{" "}
                {new Date(cycle.end_date).toLocaleDateString()}
              </span>
              {cycle.scope_location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {cycle.scope_location}
                </span>
              )}
              {cycle.scope_department_id && cycle.department && (
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" />
                  {cycle.department.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                isClosed ? "bg-gray-150 text-gray-700" : "bg-emerald-100 text-emerald-700"
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between lg:col-span-2">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Verification Progress
            </span>
            <div className="flex justify-between items-end mt-4 mb-2">
              <span className="text-3xl font-bold text-gray-900 leading-none">
                {percent}%
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {cycle.summary.total - cycle.summary.unchecked} / {cycle.summary.total} Assets Verified
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-3 gap-4 lg:col-span-2">
          <div className="bg-white p-4 rounded-xl border border-gray-100 text-center flex flex-col justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <span className="text-xs font-semibold text-gray-400">Verified</span>
            <span className="text-xl font-bold text-gray-900 mt-1">{cycle.summary.verified}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 text-center flex flex-col justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <span className="text-xs font-semibold text-gray-400">Missing</span>
            <span className="text-xl font-bold text-gray-900 mt-1">{cycle.summary.missing}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 text-center flex flex-col justify-center">
            <HelpCircle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <span className="text-xs font-semibold text-gray-400">Damaged</span>
            <span className="text-xl font-bold text-gray-900 mt-1">{cycle.summary.damaged}</span>
          </div>
        </div>
      </div>

      {/* Discrepancy report section if closed */}
      {isClosed && discrepancyReport && (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-red-900 flex items-center gap-2 m-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Discrepancy Report Summary
          </h2>
          <p className="text-sm text-red-700">
            This cycle was closed. Below are the discrepancies identified during the audit. All items marked as "missing" have been set to status LOST.
          </p>

          {discrepancyReport.discrepancies.length === 0 ? (
            <div className="text-sm text-emerald-700 font-medium">Perfect Audit! No discrepancies found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discrepancyReport.discrepancies.map((d: any) => (
                <div key={d.audit_item_id} className="bg-white p-4 rounded-xl border border-red-200/60 shadow-2xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-purple-700">{d.asset_tag}</span>
                      <h4 className="text-sm font-bold text-gray-900 mt-0.5">{d.asset_name}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      d.result === "missing" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {d.result}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <div>Notes: <span className="text-gray-700 font-medium">{d.notes || "None"}</span></div>
                    <div className="mt-1">Verified by {d.verified_by} at {new Date(d.verified_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items snapshot table */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 m-0">
            Assets Snapshot List
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Asset Tag</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Snapshot Status</th>
                  <th className="pb-3 pr-4">Audit Status</th>
                  {!isClosed && <th className="pb-3 text-right">Verification Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cycle.items.length > 0 ? (
                  cycle.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 pr-4 font-mono text-xs font-bold text-purple-700">
                        {item.asset.asset_tag}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-gray-900">
                        {item.asset.name}
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {item.asset.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        {item.result ? (
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                item.result === "verified"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.result === "missing"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.result}
                            </span>
                            {item.notes && <p className="text-[10px] text-gray-400 max-w-[150px] truncate">{item.notes}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unchecked</span>
                        )}
                      </td>
                      {!isClosed && (
                        <td className="py-3.5 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={itemNotes[item.id] || ""}
                              onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                              className="px-2 py-1 text-xs border border-gray-200 rounded-lg max-w-[120px] focus:outline-hidden"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "verified", notes: itemNotes[item.id] })}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "damaged", notes: itemNotes[item.id] })}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Damaged
                              </button>
                              <button
                                onClick={() => verifyItemMutation.mutate({ itemId: item.id, result: "missing", notes: itemNotes[item.id] })}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition cursor-pointer"
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
                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                      No assets in scope for this audit cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditor Management Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 m-0 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Auditors
            </h2>

            {/* List assigned auditors */}
            <div className="space-y-3">
              {cycle.auditors.length > 0 ? (
                cycle.auditors.map((auditor: any) => (
                  <div
                    key={auditor.id}
                    className="p-3 border border-gray-50 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {auditor.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {auditor.email}
                      </p>
                    </div>
                    {!isClosed && (
                      <button
                        onClick={() => removeMutation.mutate(auditor.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">
                  No auditors assigned yet. Cycle creator must assign auditors.
                </p>
              )}
            </div>
          </div>

          {/* Form to assign a new auditor */}
          {!isClosed && (
            <form onSubmit={handleAssign} className="border-t border-gray-100 pt-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Assign Auditor</label>
                <div className="flex gap-2">
                  {users && users.length > 0 ? (
                    <select
                      value={newAuditorId}
                      onChange={(e) => setNewAuditorId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-purple-500 bg-white"
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
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-purple-500"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={assignMutation.isPending}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
