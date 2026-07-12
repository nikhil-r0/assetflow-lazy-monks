import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Bell, Loader2, ArrowLeft, ArrowRight, Circle } from "lucide-react";
import { apiClient } from "../../api/client";

export default function Notifications() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  // 1. Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", filter, page],
    queryFn: async () => {
      const isReadParam =
        filter === "unread" ? "is_read=false" : filter === "read" ? "is_read=true" : "";
      const res = await apiClient.get<{
        data: any[];
        total: number;
        page: number;
        limit: number;
      }>(`/notifications?${isReadParam}&page=${page}&limit=${limit}`);
      return res.data;
    },
  });

  // 2. Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 3. Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-4xl mx-auto premium-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 sm:flex sm:items-center sm:justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-650 rounded-xl border border-purple-100/50">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight m-0">Notification Center</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">Manage and view your system notifications</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="premium-btn-primary py-2.5"
            >
              <Check className="mr-1.5 h-4 w-4" /> Mark all read
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex gap-2">
          {(["all", "unread", "read"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                filter === tab
                  ? "bg-purple-50 text-purple-750 border-purple-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-purple-650 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-medium text-sm">
              <p>No notifications found</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-6 flex items-start gap-4 transition-colors hover:bg-slate-50/30 ${
                  !notif.is_read ? "bg-purple-50/10" : ""
                }`}
              >
                {!notif.is_read ? (
                  <Circle className="h-2 w-2 text-purple-600 fill-purple-600 mt-2 shrink-0 animate-pulse" />
                ) : (
                  <Circle className="h-2 w-2 text-slate-200 fill-slate-200 mt-2 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border font-mono bg-slate-50 text-slate-600 border-slate-200">
                      {notif.type.replace("NOTIF.", "")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-750 mt-2.5 leading-relaxed">{notif.message}</p>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-purple-650 hover:bg-purple-50 rounded-lg border border-transparent hover:border-purple-100 transition-all cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium font-mono">
              Page {page} of {totalPages} ({totalCount} total)
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
  );
}
