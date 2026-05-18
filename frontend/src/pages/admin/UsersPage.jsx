import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "2",
};

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const roles = [
    { id: 1, name: "admin" },
    { id: 2, name: "staff" },
  ];
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      const data = await apiFetch("/users", { token });
      setUsers(data.users || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await apiFetch("/users", {
        method: "POST",
        token,
        body: {
          ...form,
          role_id: Number(form.role_id),
        },
      });
      setForm(initialForm);
      loadUsers();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <DashboardLayout
      title="Users"
      description="Create staff and admin accounts, then manage them here."
    >
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create User</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {[
              ["full_name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["password", "Password"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  {label}
                </span>
                <input
                  type={key === "password" ? "password" : "text"}
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Role
              </span>
              <select
                value={form.role_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role_id: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white"
            >
              Save User
            </button>
          </form>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">User List</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      {user.full_name}
                    </td>
                    <td className="py-3 text-slate-600">{user.email}</td>
                    <td className="py-3 capitalize text-slate-600">{user.role}</td>
                    <td className="py-3 capitalize text-slate-600">{user.status}</td>
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
