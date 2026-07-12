import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import DepartmentsTab from "./DepartmentsTab";
import CategoriesTab from "./CategoriesTab";
import DirectoryTab from "./DirectoryTab";

export function OrgSetup() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "directory">("departments");

  // Admin-only route guard
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Organization Setup</h1>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("departments")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "departments"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "categories"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "directory"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Employee Directory
          </button>
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
