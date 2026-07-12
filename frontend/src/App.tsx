import type { ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { AllocationPage } from "./pages/assets/Allocation";
import { AssetFormPage } from "./pages/assets/AssetForm";
import { RegistryPage } from "./pages/assets/Registry";
import "./App.css";

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <header
        style={{
          display: "flex",
          gap: "1rem",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #ddd",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <strong>AssetFlow</strong>
        <Link to="/assets">Registry</Link>
        <Link to="/assets/new">Register</Link>
        <Link to="/allocations">Allocations</Link>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/assets" replace />} />
          <Route path="/assets" element={<RegistryPage />} />
          <Route path="/assets/new" element={<AssetFormPage />} />
          <Route path="/allocations" element={<AllocationPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
