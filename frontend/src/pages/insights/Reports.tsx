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
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <FileBarChart className="h-8 w-8 text-purple-600" />
            Reports &amp; Analytics
          </h1>
          <p className="text-gray-500 mt-2">
            Real-time utilization metrics, maintenance records, and inventory analytics.
          </p>
        </div>

        {/* Global Export actions (Available to admins/managers only) */}
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("asset-utilization")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("utilization")}
          className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "utilization"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Asset Utilization
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "maintenance"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Maintenance Frequency
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === "heatmap"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Booking Heatmap
        </button>

        {isManager && (
          <>
            <button
              onClick={() => setActiveTab("due-attention")}
              className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "due-attention"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Due for Attention
            </button>
            <button
              onClick={() => setActiveTab("department")}
              className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === "department"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">Asset Utilization</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by tag or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-gray-50 px-3 py-2 rounded-xl hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={idleOnly}
                    onChange={(e) => setIdleOnly(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span>Idle assets only</span>
                </label>
              </div>
            </div>

            {utilizationQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                <p className="text-sm">Loading utilization data...</p>
              </div>
            ) : filteredUtilization.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No assets found matching the filters.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-150">
                      <th className="p-4">Asset Tag</th>
                      <th className="p-4">Asset Name</th>
                      <th className="p-4 text-center">Allocations</th>
                      <th className="p-4 text-center">Days Allocated</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredUtilization.map((item: any) => (
                      <tr key={item.asset_id} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-mono font-semibold text-purple-600">{item.asset_tag}</td>
                        <td className="p-4 font-medium text-gray-900">{item.name}</td>
                        <td className="p-4 text-center">{item.allocation_count}</td>
                        <td className="p-4 text-center font-semibold">{item.days_allocated} days</td>
                        <td className="p-4 text-center">
                          {item.is_idle ? (
                            <span className="inline-flex px-2 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                              Idle
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Requests by Asset Category</h3>
              {maintenanceQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
              ) : (maintenanceQuery.data?.by_category || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No maintenance data available.</div>
              ) : (
                <div className="space-y-4">
                  {(maintenanceQuery.data.by_category || []).map((cat: any) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">{cat.category}</span>
                        <span className="font-bold text-purple-600">{cat.request_count} requests</span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (cat.request_count / Math.max(...maintenanceQuery.data.by_category.map((c: any) => c.request_count))) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top requested assets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Highest Maintenance Assets</h3>
              {maintenanceQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
              ) : (maintenanceQuery.data?.by_asset || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No maintenance reports found.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-150">
                        <th className="p-3">Asset Tag</th>
                        <th className="p-3">Name</th>
                        <th className="p-3 text-center">Requests</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {maintenanceQuery.data.by_asset.slice(0, 5).map((asset: any) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50 transition">
                          <td className="p-3 font-mono font-semibold text-purple-600">{asset.asset_tag}</td>
                          <td className="p-3 font-medium text-gray-900">{asset.name}</td>
                          <td className="p-3 text-center font-bold text-red-600">{asset.request_count}</td>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Booking Density Heatmap</h2>
              <p className="text-sm text-gray-500 mt-1">Peak booking traffic analyzed by day of week and hour of day.</p>
            </div>

            {heatmapQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px] space-y-2">
                  {/* Hours Header */}
                  <div className="grid grid-cols-25 text-xs text-gray-400 font-semibold text-center border-b border-gray-100 pb-2">
                    <div></div>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour}>{String(hour).padStart(2, "0")}</div>
                    ))}
                  </div>

                  {/* Weekday Grid */}
                  {weekdays.map((dayName, dayIndex) => {
                    return (
                      <div key={dayName} className="grid grid-cols-25 items-center gap-1">
                        <div className="text-xs font-bold text-gray-500 text-right pr-3 select-none">{dayName.slice(0, 3)}</div>
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const bucket = (heatmapQuery.data || []).find(
                            (b: any) => b.weekday === dayIndex && b.hour === hour
                          );
                          const count = bucket?.count || 0;

                          // Heatmap color intensity levels
                          let bgColor = "bg-gray-50";
                          let textColor = "text-gray-400";
                          if (count > 0 && count <= 2) {
                            bgColor = "bg-purple-100";
                            textColor = "text-purple-700";
                          } else if (count > 2 && count <= 5) {
                            bgColor = "bg-purple-300";
                            textColor = "text-purple-900 font-bold";
                          } else if (count > 5) {
                            bgColor = "bg-purple-600";
                            textColor = "text-white font-bold";
                          }

                          return (
                            <div
                              key={hour}
                              title={`${dayName} at ${hour}:00 - ${count} bookings`}
                              className={`aspect-square flex items-center justify-center text-[10px] rounded transition duration-200 ${bgColor} ${textColor} hover:scale-110 cursor-help`}
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Nearing Retirement (Aged Assets)
                </h3>
                <select
                  value={yearsThreshold}
                  onChange={(e) => setYearsThreshold(e.target.value)}
                  className="px-3 py-1 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="3">3+ years old</option>
                  <option value="5">5+ years old</option>
                  <option value="7">7+ years old</option>
                </select>
              </div>

              {dueAttentionQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
              ) : (dueAttentionQuery.data?.aged_assets || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No aged assets matching the filter.</div>
              ) : (
                <div className="space-y-3">
                  {dueAttentionQuery.data.aged_assets.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-600 block">{asset.asset_tag}</span>
                        <span className="font-bold text-gray-900 text-sm">{asset.name}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-gray-500 block">Acquired: {new Date(asset.acquisition_date).toLocaleDateString()}</span>
                        <span className="inline-block mt-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* High maintenance assets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Fragile Assets (High Maintenance Frequency)
              </h3>

              {dueAttentionQuery.isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
              ) : (dueAttentionQuery.data?.high_maintenance || []).length === 0 ? (
                <div className="text-center py-12 text-gray-500">No assets with frequent maintenance issues.</div>
              ) : (
                <div className="space-y-3">
                  {dueAttentionQuery.data.high_maintenance.map((asset: any) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-600 block">{asset.asset_tag}</span>
                        <span className="font-bold text-gray-900 text-sm">{asset.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-600" />
              Department Allocations &amp; Value Distribution
            </h2>

            {departmentQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
            ) : (departmentQuery.data || []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">No department allocation data.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-150">
                      <th className="p-4">Department Name</th>
                      <th className="p-4 text-center">Active Allocations</th>
                      <th className="p-4 text-right">Total Asset Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {departmentQuery.data.map((dept: any) => (
                      <tr key={dept.department_id} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-gray-900">{dept.department}</td>
                        <td className="p-4 text-center font-semibold">{dept.active_allocations}</td>
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
