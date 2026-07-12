import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  Package,
  Wrench,
  CalendarRange,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Loader2,
  PlusCircle,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import { KpiCard } from "../../components/KpiCard";
import { apiClient } from "../../api/client";

export default function Dashboard() {
  // 1. Fetch KPI metrics
  const { data: kpis, isLoading: isKpisLoading, error: kpisError } = useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/dashboard/kpis");
      return res.data;
    },
    refetchInterval: 15000, // Refresh every 15s
  });

  // 2. Fetch overdue returns list
  const { data: overdue, isLoading: isOverdueLoading } = useQuery({
    queryKey: ["dashboard", "overdue"],
    queryFn: async () => {
      const res = await apiClient.get<any[]>("/dashboard/overdue");
      return res.data;
    },
  });

  // 3. Fetch upcoming returns list
  const { data: upcoming, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["dashboard", "upcoming-returns"],
    queryFn: async () => {
      const res = await apiClient.get<any[]>("/dashboard/upcoming-returns");
      return res.data;
    },
  });

  const isLoading = isKpisLoading || isOverdueLoading || isUpcomingLoading;

  if (kpisError) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Failed to load dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Please check your backend connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">
            Insights Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            Real-time status overview of assets, bookings, and operations.
          </p>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2.5">
          <a
            href="/assets"
            className="premium-btn-secondary py-2"
          >
            <PlusCircle className="mr-2 h-4 w-4 text-slate-500" />
            Register Asset
          </a>
          <a
            href="/bookings"
            className="premium-btn-secondary py-2"
          >
            <Calendar className="mr-2 h-4 w-4 text-slate-500" />
            Book Resource
          </a>
          <a
            href="/maintenance"
            className="premium-btn-primary py-2"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Raise Maintenance
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Available Assets"
              value={kpis?.assets_available ?? 0}
              icon={CheckCircle}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              description="System-wide catalog"
            />
            <KpiCard
              title="Allocated Assets"
              value={kpis?.assets_allocated ?? 0}
              icon={Package}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              description="In active usage"
            />
            <KpiCard
              title="Active Bookings"
              value={kpis?.active_bookings ?? 0}
              icon={CalendarRange}
              colorClass="text-indigo-600"
              bgClass="bg-indigo-50"
              description="Current or upcoming reservations"
            />
            <KpiCard
              title="Active Maintenance"
              value={kpis?.maintenance_today ?? 0}
              icon={Wrench}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
              description="Under repair or inspection"
            />
            <KpiCard
              title="Pending Transfers"
              value={kpis?.pending_transfers ?? 0}
              icon={ArrowLeftRight}
              colorClass="text-pink-600"
              bgClass="bg-pink-50"
              description="Awaiting approval"
            />
            <KpiCard
              title="Upcoming Returns"
              value={kpis?.upcoming_returns ?? 0}
              icon={Clock}
              colorClass="text-purple-600"
              bgClass="bg-purple-50"
              description="Due in next 7 days"
            />
            <KpiCard
              title="Overdue Returns"
              value={kpis?.overdue_returns ?? 0}
              icon={AlertTriangle}
              colorClass="text-red-600"
              bgClass="bg-red-50"
              description="Past return target date"
            />
          </div>

          {/* Return alerts split panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Overdue Returns List */}
            <div className="premium-card p-6 flex flex-col h-[400px] hover:border-red-200">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shadow-2xs">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 m-0">
                      Overdue Returns
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Urgent action required
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold font-mono border border-red-100">
                  {overdue?.length ?? 0} items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
                {overdue && overdue.length > 0 ? (
                  overdue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-slate-100 hover:border-red-100 hover:bg-red-50/10 rounded-xl transition-all duration-200 flex justify-between items-start gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.asset.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          Tag: <span className="font-bold text-purple-600">{item.asset.asset_tag}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          Holder:{" "}
                          <span className="text-slate-800 font-semibold">
                            {item.employee
                              ? `${item.employee.name} (${item.employee.email})`
                              : item.department?.name ?? "N/A"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          {item.days_overdue}d overdue
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          Due: {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-slate-400">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
                    <p className="text-sm font-bold text-slate-700">All caught up</p>
                    <p className="text-xs text-slate-400 mt-0.5">No overdue returns at this time.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Returns List */}
            <div className="premium-card p-6 flex flex-col h-[400px]">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shadow-2xs">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 m-0">
                      Upcoming Returns
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Expected in the next 7 days
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold font-mono border border-purple-100">
                  {upcoming?.length ?? 0} items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
                {upcoming && upcoming.length > 0 ? (
                  upcoming.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border border-slate-100 hover:border-purple-100 hover:bg-purple-50/10 rounded-xl transition-all duration-200 flex justify-between items-start gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.asset.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          Tag: <span className="font-bold text-purple-600">{item.asset.asset_tag}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-2 font-medium">
                          Holder:{" "}
                          <span className="text-slate-800 font-semibold">
                            {item.employee
                              ? `${item.employee.name} (${item.employee.email})`
                              : item.department?.name ?? "N/A"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                          Due: {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString() : "-"}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          Alloc: {new Date(item.allocated_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-slate-400">
                    <Clock className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">No upcoming returns</p>
                    <p className="text-xs text-slate-400 mt-0.5">No asset returns scheduled for next 7 days.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
