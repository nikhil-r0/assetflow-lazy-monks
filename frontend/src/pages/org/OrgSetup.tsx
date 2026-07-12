import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import DepartmentsTab from "./DepartmentsTab";
import CategoriesTab from "./CategoriesTab";
import DirectoryTab from "./DirectoryTab";

export function OrgSetup() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "directory">(
    "departments",
  );

  // Admin-only — BUILD_SPEC §0.8 / A-Phase 5
  if (user?.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">403 Forbidden</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Org Setup is admin-only</h1>
        <p className="mt-2 text-sm text-gray-500">
          Departments, categories, and role promotion are restricted to administrators.
        </p>
      </main>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Organization Setup</h1>
      <p className="mb-6 text-sm text-gray-500">
        Manage departments, asset categories, and employee roles.
      </p>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(
            [
              ["departments", "Departments"],
              ["categories", "Categories"],
              ["directory", "Employee Directory"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium ${
                activeTab === key
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === "departments" && <DepartmentsTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "directory" && <DirectoryTab />}
      </div>
    </div>
  );
}
