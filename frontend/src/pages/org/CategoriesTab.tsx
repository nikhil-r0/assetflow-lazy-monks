import React, { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

export default function CategoriesTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Edit Category State
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // New Custom Field State
  const [addingFieldToCategory, setAddingFieldToCategory] = useState<number | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/categories");
      setCategories(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiClient.post("/categories", { name: newCategoryName });
      setNewCategoryName("");
      setIsAddingCategory(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to create category");
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCategoryName.trim()) return;
    try {
      await apiClient.patch(`/categories/${id}`, { name: editCategoryName });
      setEditingCategoryId(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await apiClient.delete(`/categories/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to delete category");
    }
  };

  const handleCreateCustomField = async (categoryId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    try {
      await apiClient.post(`/categories/${categoryId}/fields`, {
        field_name: newFieldName,
        field_type: newFieldType,
      });
      setNewFieldName("");
      setNewFieldType("text");
      setAddingFieldToCategory(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to create custom field");
    }
  };

  const handleDeleteCustomField = async (categoryId: number, fieldId: number) => {
    if (!confirm("Are you sure you want to delete this custom field?")) return;
    try {
      await apiClient.delete(`/categories/${categoryId}/fields/${fieldId}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to delete custom field");
    }
  };

  if (loading && categories.length === 0) return <div>Loading categories...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Asset Categories</h2>
        <button
          onClick={() => setIsAddingCategory(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          Add Category
        </button>
      </div>

      {isAddingCategory && (
        <form onSubmit={handleCreateCategory} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Laptops"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCategory(false)}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="flex justify-between items-start mb-4">
              {editingCategoryId === cat.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                  />
                  <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 text-sm font-medium">Save</button>
                  <button onClick={() => setEditingCategoryId(null)} className="text-gray-500 text-sm font-medium">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium text-gray-900">{cat.name}</h3>
                  <button
                    onClick={() => {
                      setEditingCategoryId(cat.id);
                      setEditCategoryName(cat.name);
                    }}
                    className="text-gray-400 hover:text-purple-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-gray-400 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setAddingFieldToCategory(cat.id)}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                + Add Custom Field
              </button>
            </div>

            {addingFieldToCategory === cat.id && (
              <form onSubmit={(e) => handleCreateCustomField(cat.id, e)} className="mb-4 p-3 bg-purple-50 rounded-lg flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g. RAM Size"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Field Type</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium">Add</button>
                  <button type="button" onClick={() => setAddingFieldToCategory(null)} className="text-gray-500 text-sm font-medium px-2">Cancel</button>
                </div>
              </form>
            )}

            {cat.custom_fields && cat.custom_fields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {cat.custom_fields.map((field: any) => (
                  <div key={field.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded p-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block">{field.field_name}</span>
                      <span className="text-xs text-gray-500 uppercase">{field.field_type}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomField(cat.id, field.id)}
                      className="text-gray-400 hover:text-red-500 text-xs p-1"
                      title="Delete Field"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No custom fields defined for this category.</p>
            )}
          </div>
        ))}

        {categories.length === 0 && !isAddingCategory && (
          <div className="text-center py-12 text-gray-500">
            No categories found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
