import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2 } from "lucide-react";
import { apiClient } from "../api/client";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 1. Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>("/notifications/unread-count");
      return res.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // 2. Fetch latest 5 unread notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", "latest-unread"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: any[] }>("/notifications?is_read=false&limit=5");
      return res.data;
    },
    enabled: isOpen, // Only fetch when dropdown is open
  });

  // 3. Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // 4. Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = unreadCountData?.count || 0;
  const notifications = notificationsData?.data || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200 focus:outline-none"
        id="notification-bell-btn"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/3 -translate-y-1/3 bg-red-500 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="font-semibold text-sm text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-gray-50 hover:bg-purple-50/30 transition-colors flex gap-2 items-start"
                >
                  <div className="flex-1">
                    <p className="text-xs text-gray-700 leading-snug">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(notif.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="p-1 text-gray-400 hover:text-purple-600 rounded-full hover:bg-purple-50 transition-colors cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
            <a
              href="/notifications"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                // Programmatic navigation or router push
                window.location.href = "/notifications";
              }}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 block py-1"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
