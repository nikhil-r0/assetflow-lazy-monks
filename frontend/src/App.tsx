import "./App.css";

import {
  BrowserRouter,
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

// Track D
import Notifications from "./pages/insights/Notifications";
import ActivityLogs from "./pages/insights/ActivityLogs";

function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">
        KPI widgets coming in Phase 2.
      </p>
    </div>
  );
}

function Audit() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Audit Cycles</h1>
      <p className="mt-2 text-gray-500">
        Audit management coming in Phase 3 &amp; 4.
      </p>
    </div>
  );
}

function Reports() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Reports &amp; Analytics
      </h1>
      <p className="mt-2 text-gray-500">
        Analytics charts coming in Phase 5.
      </p>
    </div>
  );
}

const NAV = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    to: "/audit",
    icon: ClipboardList,
    label: "Audit Cycles",
  },
  {
    to: "/reports",
    icon: BarChart3,
    label: "Reports",
  },
  {
    to: "/notifications",
    icon: Bell,
    label: "Notifications",
  },
  {
    to: "/activity-logs",
    icon: Activity,
    label: "Activity Logs",
  },
  {
    to: "/org",
    icon: Settings,
    label: "Org Setup",
  },
];

const Layout = () => {
  const { logout } = useAuth();

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

          <p className="mt-0.5 text-xs text-gray-400">
            Insights Module · Phase 1
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, icon: Icon, label }) => (
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