import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialForm = {
  name: "",
  description: "",
  status: "active",
};

export default function DocumentCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCategories() {
    try {
      const data = await apiFetch("/document-categories", { token });
      setCategories(data.categories || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadCategories();
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await apiFetch(
        editingId ? `/document-categories/${editingId}` : "/document-categories",
        {
          method: editingId ? "PUT" : "POST",
          token,
          body: form,
        }
      );

      setForm(initialForm);
      setEditingId(null);
      setSuccess("Document category saved successfully.");
      loadCategories();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || "",
      status: category.status,
    });
  }

  async function deleteCategory(categoryId) {
    try {
      await apiFetch(`/document-categories/${categoryId}`, {
        method: "DELETE",
        token,
      });
      setSuccess("Document category deleted successfully.");
      loadCategories();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <DashboardLayout
      title="Document Categories"
      description="Configure the categories employees must choose when uploading documents."
    >
      {error ? (
        <div className="mb-5 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            {editingId ? "Edit Category" : "New Category"}
          </h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Name
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows="3"
                className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-[8px] bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white"
            >
              {editingId ? "Update Category" : "Create Category"}
            </button>
          </form>
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            Document Categories
          </h2>
          <div className="mt-5 overflow-x-auto rounded-[8px] border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {category.description || "No description"}
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">
                      {category.status}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="mr-2 rounded-[8px] bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(category.id)}
                        className="rounded-[8px] bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
