import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialForm = {
  connected_email: "movepromotion1@gmail.com",
  root_folder_id: "",
  pending_folder_id: "",
  approved_folder_id: "",
  rejected_folder_id: "",
  status: "disconnected",
};

export default function GoogleDriveSettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiFetch("/settings/google-drive", { token });
        setForm({ ...initialForm, ...(data.settings || {}) });
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadSettings();
  }, [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const data = await apiFetch("/settings/google-drive", {
        method: "PATCH",
        token,
        body: form,
      });
      setForm({ ...initialForm, ...(data.settings || {}) });
      setSuccess("Google Drive settings saved successfully.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <DashboardLayout
      title="Google Drive Integration"
      description="Configure the Drive folders used by the document approval workflow."
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            Connection Settings
          </h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {[
              ["connected_email", "Connected Account Email"],
              ["root_folder_id", "Root Folder ID"],
              ["pending_folder_id", "Pending Documents Folder ID"],
              ["approved_folder_id", "Approved Documents Folder ID"],
              ["rejected_folder_id", "Rejected Documents Folder ID"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  {label}
                </span>
                <input
                  value={form[key] || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Connection Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-[8px] bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white"
              >
                Save Drive Settings
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-950">
            Recommended Structure
          </h2>
          <div className="mt-4 rounded-[8px] bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
            <p>Job Management System/</p>
            <p>  Pending Documents/</p>
            <p>    JOB-2026-0001/</p>
            <p>  Approved Documents/</p>
            <p>    JOB-2026-0001/</p>
            <p>      Approval Documents/</p>
            <p>      Contracts/</p>
            <p>      Reports/</p>
            <p>  Rejected Documents/</p>
            <p>    JOB-2026-0001/</p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
