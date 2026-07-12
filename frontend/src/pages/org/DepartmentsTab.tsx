import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    parent_department_id: "",
    head_user_id: "",
    status: "active",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, usersRes] = await Promise.all([
        apiClient.get("/departments"),
        // Mocking user fetch since users route might not be fully there, but auth routes are.
        // We only want users who are eligible to be department heads
        apiClient.get("/users?role=department_head").catch(() => ({ data: { data: [] } }))
      ]);
      setDepartments(deptRes.data.data || []);
      setUsers(usersRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (dept?: any) => {
    setFormError(null);
    if (dept) {
      setEditingDept(dept);
      setFormData({
        name: dept.name,
        parent_department_id: dept.parent_department_id || "",
        head_user_id: dept.head_user_id || "",
        status: dept.status,
      });
    } else {
      setEditingDept(null);
      setFormData({
        name: "",
        parent_department_id: "",
        head_user_id: "",
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setFormError(null);
      const payload = {
        name: formData.name,
        parent_department_id: formData.parent_department_id ? parseInt(formData.parent_department_id) : null,
        head_user_id: formData.head_user_id ? parseInt(formData.head_user_id) : null,
        status: formData.status,
      };

      if (editingDept) {
        await apiClient.patch(`/departments/${editingDept.id}`, payload);
      } else {
        await apiClient.post("/departments", payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || "Failed to save department");
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this department?")) return;
    try {
      await apiClient.delete(`/departments/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to deactivate");
    }
  };

  if (loading) return <div>Loading departments...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Departments</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" /> Add Department
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Head</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {departments.map((dept: any) => (
              <tr key={dept.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dept.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dept.parent_department?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dept.head_user?.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    dept.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {dept.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleOpenModal(dept)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {dept.status === 'active' && (
                    <button onClick={() => handleDeactivate(dept.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No departments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingDept ? "Edit Department" : "Add Department"}
            </h3>
            
            {formError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Department</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.parent_department_id}
                  onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value })}
                >
                  <option value="">None</option>
                  {departments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Head User</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.head_user_id}
                  onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}
                >
                  <option value="">None</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {editingDept && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
