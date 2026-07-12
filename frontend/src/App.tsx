import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="flex h-screen w-full bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-indigo-600">AssetFlow</h1>
        </div>
        <nav className="flex-1 p-4">
          <p className="text-sm text-gray-500">Navigation Placeholder</p>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
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
    </div>
  </div>
);

const App = () => {
  const isAuthenticated = false; // Placeholder

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PlaceholderLogin />} />
        
        <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<div>Dashboard Placeholder</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
