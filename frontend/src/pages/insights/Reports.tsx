import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import {
  FileBarChart,
  Download,
  Loader2,
  AlertTriangle,
  Users,
  ShieldAlert,
  Search,
} from "lucide-react";

type ReportTab =
  | "utilization"
  | "maintenance"
  | "due-attention"
  | "department"
  | "heatmap";

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>("utilization");
  const [searchQuery, setSearchQuery] = useState("");
  const [idleOnly, setIdleOnly] = useState(false);
  const [yearsThreshold, setYearsThreshold] = useState("5");

  const isManager = user?.role === "admin" || user?.role === "asset_manager";

  // 1. Fetch Utilization Report
  const utilizationQuery = useQuery({
    queryKey: ["reports", "utilization"],
    queryFn: async () => {
      const res = await apiClient.get("/reports/asset-utilization");
      return res.data;
    },
    enabled: activeTab === "utilization",
  });

  // 2. Fetch Maintenance Frequency
  const maintenanceQuery = useQuery({
    queryKey: ["reports", "maintenance"],
    queryFn: async () => {
      const res = await apiClient.get("/reports/maintenance-frequency");
      return res.data;
    },
    enabled: activeTab === "maintenance",
  });

  // 3. Fetch Due for Attention
  const dueAttentionQuery = useQuery({
    queryKey: ["reports", "due-attention", yearsThreshold],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/due-for-attention?years=${yearsThreshold}`);
      return res.data;
    },
    enabled: activeTab === "due-attention" && isManager,
  });

  // 4. Fetch Department Allocation
  const departmentQuery = useQuery({
    queryKey: ["reports", "department"],
    queryFn: async () => {
      const res = await apiClient.get("/reports/department-allocation");
      return res.data;
    },
    enabled: activeTab === "department" && isManager,
  });

  // 5. Fetch Booking Heatmap
  const heatmapQuery = useQuery({
    queryKey: ["reports", "heatmap"],
    queryFn: async () => {
      const res = await apiClient.get("/reports/booking-heatmap");
      return res.data;
    },
    enabled: activeTab === "heatmap",
  });

  // Trigger CSV Export via direct download link
  const handleExport = async (reportName: string) => {
    try {
      const response = await apiClient.get(`/reports/export?report=${reportName}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportName}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export report: Please make sure you have appropriate manager roles.");
    }
  };

  // Filtered Assets for Utilization
  const filteredUtilization = (utilizationQuery.data || []).filter((item: any) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset_tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIdle = !idleOnly || item.is_idle;
    return matchesSearch && matchesIdle;
  });

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in bg-slate-50/20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-150 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FileBarChart className="h-8 w-8 text-purple-600" />
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Real-time utilization metrics, maintenance records, and inventory analytics.
          </p>
        </div>

        {/* Global Export actions (Available to admins/managers only) */}
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("asset-utilization")}
              className="premium-btn-secondary py-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
        <button
          onClick={() => setActiveTab("utilization")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            activeTab === "utilization"
              ? "bg-purple-50 text-purple-700 border border-purple-100/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Asset Utilization
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            activeTab === "maintenance"
              ? "bg-purple-50 text-purple-700 border border-purple-100/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Maintenance Frequency
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            activeTab === "heatmap"
              ? "bg-purple-50 text-purple-700 border border-purple-100/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Booking Heatmap
        </button>

        {isManager && (
          <>
            <button
              onClick={() => setActiveTab("due-attention")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === "due-attention"
                  ? "bg-purple-50 text-purple-700 border border-purple-100/50"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              Due for Attention
            </button>
            <button
              onClick={() => setActiveTab("department")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === "department"
                  ? "bg-purple-50 text-purple-700 border border-purple-100/50"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              Department Allocations
            </button>
          </>
        )}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* Tab 1: Asset Utilization */}
        {activeTab === "utilization" && (
          <div className="premium-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Asset Utilization</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Tracks total checkout frequency and total allocated duration.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by tag or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="premium-input pl-10 py-2 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={idleOnly}
                    onChange={(e) => setIdleOnly(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <span>Idle assets only</span>
                </label>
              </div>
            </div>

            {utilizationQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                <p className="text-xs font-medium">Loading utilization data...</p>
              </div>
            ) : filteredUtilization.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-medium">No assets found matching the filters.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4">Asset Tag</th>
                      <th className="p-4">Asset Name</th>
                      <th className="p-4 text-center">Allocations</th>
                      <th className="p-4 text-center">Days Allocated</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {filteredUtilization.map((item: any) => (
                      <tr key={item.asset_id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-mono font-semibold text-purple-650">{item.asset_tag}</td>
                        <td className="p-4 font-bold text-slate-900">{item.name}</td>
                        <td className="p-4 text-center font-mono">{item.allocation_count}</td>
                        <td className="p-4 text-center font-semibold">{item.days_allocated} days</td>
                        <td className="p-4 text-center">
                          {item.is_idle ? (
                            <span className="inline-flex px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-250 font-mono">
                              Idle
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-mono">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Maintenance Frequency */}
        {activeTab === "maintenance" && (
          <div className="space-y-8">
            <div className="premium-card p-6 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Maintenance Events by Category</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Categorized breakdown of all ticket frequencies.</p>
              </div>

              {maintenanceQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs font-semibold">Loading ticket data...</p>
                </div>
              ) : (maintenanceQuery.data?.by_category || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No maintenance records found.</div>
              ) : (
                <div className="space-y-4">
                  {(maintenanceQuery.data?.by_category || []).map((cat: any) => {
                    const maxCount = Math.max(...(maintenanceQuery.data?.by_category || []).map((c: any) => c.request_count));
                    const percent = maxCount > 0 ? Math.round((cat.request_count / maxCount) * 100) : 0;
                    return (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="capitalize">{cat.category}</span>
                          <span className="font-mono text-slate-500">{cat.request_count} requests ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/55">
                          <div
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="premium-card p-6 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Highest Maintenance Assets</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Top 5 assets sorted by total repair ticket count.</p>
              </div>

              {maintenanceQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs font-semibold">Loading top assets...</p>
                </div>
              ) : (maintenanceQuery.data?.by_asset || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No maintenance reports found.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="p-4">Asset Tag</th>
                        <th className="p-4">Asset Name</th>
                        <th className="p-4 text-center">Requests</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {(maintenanceQuery.data?.by_asset || []).slice(0, 5).map((asset: any) => (
                        <tr key={asset.asset_id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-mono font-semibold text-purple-650">{asset.asset_tag}</td>
                          <td className="p-4 font-bold text-slate-900">{asset.name}</td>
                          <td className="p-4 text-center font-mono font-bold text-red-600">{asset.request_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Tab 3: Booking Heatmap */}
        {activeTab === "heatmap" && (
          <div className="premium-card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Booking Density Heatmap</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium font-sans">Peak booking traffic analyzed by day of week and hour of day.</p>
            </div>

            {heatmapQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                <p className="text-xs font-semibold">Loading booking data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px] space-y-3 p-1">
                  {/* Hours Header */}
                  <div className="grid grid-cols-25 text-[10px] text-slate-400 font-bold text-center border-b border-slate-100 pb-3 font-mono">
                    <div></div>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className="uppercase">{String(hour).padStart(2, "0")}h</div>
                    ))}
                  </div>

                  {/* Weekday Grid */}
                  {weekdays.map((dayName, dayIndex) => {
                    return (
                      <div key={dayName} className="grid grid-cols-25 items-center gap-1.5">
                        <div className="text-[10px] font-extrabold text-slate-500 text-right pr-4 select-none uppercase tracking-wider font-mono">{dayName.slice(0, 3)}</div>
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const bucket = (heatmapQuery.data || []).find(
                            (b: any) => b.weekday === dayIndex && b.hour === hour
                          );
                          const count = bucket?.count || 0;

                          // Heatmap color intensity levels
                          let bgColor = "bg-slate-50 border border-slate-100";
                          let textColor = "text-slate-400";
                          if (count > 0 && count <= 2) {
                            bgColor = "bg-purple-50 border border-purple-100/50";
                            textColor = "text-purple-700 font-semibold";
                          } else if (count > 2 && count <= 5) {
                            bgColor = "bg-purple-150 border border-purple-200/50";
                            textColor = "text-purple-900 font-extrabold";
                          } else if (count > 5) {
                            bgColor = "bg-purple-600 border border-purple-700";
                            textColor = "text-white font-extrabold";
                          }

                          return (
                            <div
                              key={hour}
                              title={`${dayName} at ${hour}:00 - ${count} bookings`}
                              className={`aspect-square flex items-center justify-center text-[10px] rounded-lg transition-all duration-200 ${bgColor} ${textColor} hover:scale-110 cursor-help font-mono`}
                            >
                              {count || ""}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Due for Attention */}
        {activeTab === "due-attention" && isManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aged assets */}
            <div className="premium-card p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Nearing Retirement (Aged Assets)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">* Aged assets exceeding lifecycle based on acquisition.</p>
                </div>
                <select
                  value={yearsThreshold}
                  onChange={(e) => setYearsThreshold(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none bg-white cursor-pointer"
                >
                  <option value="3">3+ years old</option>
                  <option value="5">5+ years old</option>
                  <option value="7">7+ years old</option>
                </select>
              </div>

              {dueAttentionQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs font-semibold">Loading aged assets...</p>
                </div>
              ) : (dueAttentionQuery.data?.aged_assets || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No aged assets matching the filter.</div>
              ) : (
                <div className="space-y-3">
                  {dueAttentionQuery.data.aged_assets.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border border-slate-100 hover:border-purple-100 rounded-xl bg-slate-50/20 hover:bg-slate-50 transition">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-750 block">{asset.asset_tag}</span>
                        <span className="font-bold text-slate-950 text-xs">{asset.name}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px] font-medium">Acquired: {new Date(asset.acquisition_date).toLocaleDateString()}</span>
                        <span className="inline-block mt-1.5 font-mono font-bold text-[9px] uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High maintenance assets */}
            <div className="premium-card p-6 space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Fragile Assets (High Maintenance Frequency)
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">* Assets requiring frequent repair operations (over 3 events).</p>
              </div>

              {dueAttentionQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600 mb-2" />
                  <p className="text-xs font-semibold">Loading fragile assets...</p>
                </div>
              ) : (dueAttentionQuery.data?.high_maintenance || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">No assets with frequent maintenance issues.</div>
              ) : (
                <div className="space-y-3">
                  {dueAttentionQuery.data.high_maintenance.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border border-slate-100 hover:border-purple-100 rounded-xl bg-slate-50/20 hover:bg-slate-50 transition">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-750 block">{asset.asset_tag}</span>
                        <span className="font-bold text-slate-950 text-xs">{asset.name}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-red-750 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 uppercase">
                        {asset.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Department Allocations */}
        {activeTab === "department" && isManager && (
          <div className="premium-card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-purple-600" />
                Department Allocations &amp; Value Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium font-sans">Financial distribution and check-out metrics across different corporate divisions.</p>
            </div>

            {departmentQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-450">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                <p className="text-xs font-semibold">Loading department allocations...</p>
              </div>
            ) : (departmentQuery.data || []).length === 0 ? (
              <div className="text-center py-12 text-slate-450 text-sm font-medium">No department allocation data.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4">Department Name</th>
                      <th className="p-4 text-center">Active Allocations</th>
                      <th className="p-4 text-right">Total Asset Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {departmentQuery.data.map((dept: any) => (
                      <tr key={dept.department_id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-bold text-slate-900">{dept.department}</td>
                        <td className="p-4 text-center font-mono">{dept.active_allocations}</td>
                        <td className="p-4 text-right font-mono font-bold text-purple-700">
                          ${dept.total_asset_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
