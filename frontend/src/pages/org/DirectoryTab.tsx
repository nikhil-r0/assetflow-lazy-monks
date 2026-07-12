import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

export default function DirectoryTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("q", searchQuery);

      const [usersRes, deptRes] = await Promise.all([
        apiClient.get(`/users?${params.toString()}`),
        apiClient.get("/departments"),
      ]);

      setUsers(usersRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, statusFilter, searchQuery]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (userId === currentUser?.id) {
      alert("You cannot change your own role.");
      return;
    }
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update role");
    }
  };

  const handleStatusChange = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (!confirm(`Are you sure you want to change this user's status to ${newStatus}?`)) return;

    try {
      await apiClient.patch(`/users/${userId}`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update status");
    }
  };

  const handleDepartmentChange = async (userId: number, deptId: string) => {
    try {
      await apiClient.patch(`/users/${userId}`, { 
        department_id: deptId ? parseInt(deptId, 10) : null 
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update department");
    }
  };

  if (loading && users.length === 0) return <div>Loading directory...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
        <h2 className="text-xl font-semibold">Employee Directory</h2>
        
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name/email..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="asset_manager">Asset Manager</option>
            <option value="department_head">Department Head</option>
            <option value="employee">Employee</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  <div className="text-sm text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    className="border border-gray-300 rounded px-2 py-1 bg-transparent"
                    value={u.department_id || ""}
                    onChange={(e) => handleDepartmentChange(u.id, e.target.value)}
                  >
                    <option value="">None</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    className="border border-gray-300 rounded px-2 py-1 bg-transparent"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === currentUser?.id}
                  >
                    <option value="admin">Admin</option>
                    <option value="asset_manager">Asset Manager</option>
                    <option value="department_head">Department Head</option>
                    <option value="employee">Employee</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleStatusChange(u.id, u.status)}
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                      u.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {u.status}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
