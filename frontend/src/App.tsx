import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Bell, BarChart3, Activity } from 'lucide-react'
import { NotificationBell } from './components/NotificationBell'
import Notifications from './pages/insights/Notifications'
import ActivityLogs from './pages/insights/ActivityLogs'

// ── Placeholder pages for other phases ──────────────────────────────────────
function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-2">KPI widgets coming in Phase 2.</p>
    </div>
  )
}
function Audit() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Audit Cycles</h1>
      <p className="text-gray-500 mt-2">Audit management coming in Phase 3 & 4.</p>
    </div>
  )
}
function Reports() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
      <p className="text-gray-500 mt-2">Analytics charts coming in Phase 5.</p>
    </div>
  )
}

// ── Navigation definition ────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/audit',          icon: ClipboardList,   label: 'Audit Cycles' },
  { to: '/reports',        icon: BarChart3,        label: 'Reports' },
  { to: '/notifications',  icon: Bell,             label: 'Notifications' },
  { to: '/activity-logs',  icon: Activity,         label: 'Activity Logs' },
]

// ── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div className="flex h-screen bg-gray-50 font-sans" style={{ textAlign: 'left' }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-xl font-extrabold tracking-tight text-purple-600">
            Asset<span className="text-gray-900">Flow</span>
          </span>
          <p className="text-xs text-gray-400 mt-0.5">Insights Module · Track D</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 text-xs text-gray-400">
          AssetFlow v0.1 · Phase 1
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-xs">
          <span className="text-sm font-medium text-gray-700">AssetFlow Insights</span>
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
