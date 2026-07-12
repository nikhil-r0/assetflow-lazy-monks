import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";

// Track B
import { RegistryPage } from "./pages/assets/Registry";
import { AssetFormPage } from "./pages/assets/AssetForm";
import { AllocationPage } from "./pages/assets/Allocation";

// Track C
import { BookingPage } from "./pages/ops/Booking";

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-gray-50">
      <aside className="w-64 border-r bg-white flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-xl font-bold text-indigo-600">AssetFlow</h1>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 text-sm">
          <Link to="/assets">Registry</Link>
          <Link to="/assets/new">Register</Link>
          <Link to="/allocations">Allocations</Link>
          <Link to="/bookings">Bookings</Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

const PlaceholderLogin = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="rounded-lg bg-white p-8 shadow-md">
      <h2 className="mb-4 text-2xl font-bold">Login</h2>
      <p className="text-gray-500">Auth module is not yet implemented.</p>
      <p className="mt-2 text-xs text-gray-400">
        Dev bypass: set localStorage mock-user-id / mock-user-role, or flip
        isAuthenticated in App.tsx.
      </p>
    </div>
  </div>
);

export default function App() {
  // Replace with auth context later — true for hackathon parallel UI work
  const isAuthenticated = true;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PlaceholderLogin />} />

        <Route
          element={
            isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<div>Dashboard Placeholder</div>} />

          {/* Track B */}
          <Route path="/assets" element={<RegistryPage />} />
          <Route path="/assets/new" element={<AssetFormPage />} />
          <Route path="/allocations" element={<AllocationPage />} />

          {/* Track C */}
          <Route path="/bookings" element={<BookingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
