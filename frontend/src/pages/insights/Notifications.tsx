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
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 sm:flex sm:items-center sm:justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 m-0">Notification Center</h1>
              <p className="text-sm text-gray-500 mt-1">Manage and view your system notifications</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-xs text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none transition-colors cursor-pointer"
            >
              <Check className="mr-2 h-4 w-4" /> Mark all read
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex gap-2">
          {(["all", "unread", "read"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === tab
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-16 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <p className="text-base">No notifications found</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-6 flex items-start gap-4 transition-colors hover:bg-gray-50/50 ${
                  !notif.is_read ? "bg-purple-50/10" : ""
                }`}
              >
                {!notif.is_read ? (
                  <Circle className="h-3 w-3 text-purple-600 fill-purple-600 mt-1.5 shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 text-gray-200 mt-1.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                      {notif.type.replace("NOTIF.", "")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 leading-relaxed">{notif.message}</p>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages} ({totalCount} total)
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
  );
}
