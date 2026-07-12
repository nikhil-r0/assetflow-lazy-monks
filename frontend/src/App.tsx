import "./App.css";

import {
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  BarChart3,
  Activity,
  Wrench,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { OrgSetup } from "./pages/org/OrgSetup";

import { NotificationBell } from "./components/NotificationBell";

// Track B
import { RegistryPage } from "./pages/assets/Registry";
import { AssetFormPage } from "./pages/assets/AssetForm";
import { AllocationPage } from "./pages/assets/Allocation";

// Track C
import { BookingPage } from "./pages/ops/Booking";
import { MaintenancePage } from "./pages/ops/Maintenance";

// Track D
import Dashboard from "./pages/insights/Dashboard";
import Audit from "./pages/insights/Audit";
import AuditCycle from "./pages/insights/AuditCycle";
import Notifications from "./pages/insights/Notifications";
import ActivityLogs from "./pages/insights/ActivityLogs";
import Reports from "./pages/insights/Reports";
type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  /** If set, only these roles see the link. Omit = all authenticated. */
  roles?: string[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/bookings", icon: CalendarDays, label: "Bookings" },
  { to: "/maintenance", icon: Wrench, label: "Maintenance" },
  {
    to: "/audit",
    icon: ClipboardList,
    label: "Audit Cycles",
    roles: ["admin", "asset_manager"],
  },
  {
    to: "/reports",
    icon: BarChart3,
    label: "Reports",
    roles: ["admin", "asset_manager", "department_head"],
  },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/activity-logs", icon: Activity, label: "Activity Logs" },
  { to: "/org", icon: Settings, label: "Org Setup", roles: ["admin"] },
];

const Layout = () => {
  const { logout, user } = useAuth();
  const role = user?.role;
  const navItems = NAV.filter(
    (item) => !item.roles || (role != null && item.roles.includes(role)),
  );

  return (
    <div
      className="flex h-screen bg-gray-50 font-sans"
      style={{ textAlign: "left" }}
    >
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <span className="text-xl font-extrabold tracking-tight text-purple-600">
            Asset<span className="text-gray-900">Flow</span>
          </span>

          <p className="mt-0.5 text-xs text-gray-400">AssetFlow</p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4 text-xs text-gray-400">
          AssetFlow v0.1
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
          <span className="text-sm font-medium text-gray-700">
            AssetFlow
          </span>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => {
                logout();
              }}
              className="text-gray-500 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Track A */}
            <Route path="/org" element={<OrgSetup />} />

            {/* Track D */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/audit/:id" element={<AuditCycle />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/notifications"
              element={<Notifications />}
            />
            <Route
              path="/activity-logs"
              element={<ActivityLogs />}
            />

            {/* Track B */}
            <Route path="/assets" element={<RegistryPage />} />
            <Route path="/assets/new" element={<AssetFormPage />} />
            <Route
              path="/allocations"
              element={<AllocationPage />}
            />

            {/* Track C */}
            <Route path="/bookings" element={<BookingPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />

            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !isAuthenticated ? (
            <Login />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/signup"
        element={
          !isAuthenticated ? (
            <Signup />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}