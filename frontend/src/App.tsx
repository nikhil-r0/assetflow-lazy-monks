import React from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";

// Track B
import { RegistryPage } from "./pages/assets/Registry";
import { AssetFormPage } from "./pages/assets/AssetForm";
import { AllocationPage } from "./pages/assets/Allocation";

// Track D (when implemented)
// import { DashboardPage } from "./pages/dashboard/Dashboard";

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-gray-50">
      <aside className="w-64 border-r bg-white flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold text-indigo-600">
            AssetFlow
          </h1>
        </div>

        <nav className="flex-1 p-4">
          <p className="text-sm text-gray-500">
            Navigation Placeholder
          </p>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
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
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" replace />} />

        <Route
          element={
            isAuthenticated ? (
              <Layout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<div>Dashboard Placeholder</div>}
          />

          {/* Track B */}
          <Route path="/assets" element={<RegistryPage />} />
          <Route path="/assets/new" element={<AssetFormPage />} />
          <Route path="/allocations" element={<AllocationPage />} />

          {/* Track C */}
          {/* <Route path="/bookings" element={<BookingsPage />} /> */}

          {/* Track D */}
          {/* <Route path="/reports" element={<ReportsPage />} /> */}
        </Route>
      </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}