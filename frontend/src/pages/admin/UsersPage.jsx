import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setSuccess("");

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
      setIsModalOpen(false);
      setSuccess("User created successfully.");
      loadUsers();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(initialForm);
    setError("");
  }

  return (
    <DashboardLayout
      title="Users"
      description="Create staff and admin accounts, then manage them here."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">User List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review staff and admin accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {error && !isModalOpen ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm md:rounded-[30px] md:p-6">
          <div className="divide-y divide-slate-100 md:hidden">
            {users.map((user) => (
              <article key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-slate-900">
                      {user.full_name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[var(--brand-700)]">
                    {user.role}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Role
                    </p>
                    <p className="mt-1 capitalize text-slate-700">{user.role}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </p>
                    <p className="mt-1 capitalize text-slate-700">{user.status}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Create User
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a staff or admin account.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
