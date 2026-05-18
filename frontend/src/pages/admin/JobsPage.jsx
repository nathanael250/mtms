import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialForm = {
  job_code: "",
  title: "",
  description: "",
  start_date: "",
  end_date: "",
};

export default function JobsPage() {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [approvalFile, setApprovalFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadJobs() {
    try {
      const data = await apiFetch("/jobs", { token });
      setJobs(data.jobs || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries({
        ...form,
        created_by: user.id,
      }).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (approvalFile) {
        formData.append("related_type", "job");
        formData.append("file", approvalFile);
      }

      await apiFetch("/jobs", {
        method: "POST",
        token,
        body: formData,
      });
      setForm(initialForm);
      setApprovalFile(null);
      setIsModalOpen(false);
      setSuccess("Job created successfully.");
      loadJobs();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openModal() {
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setError("");
    setForm(initialForm);
    setApprovalFile(null);
  }

  function formatDate(value) {
    if (!value) {
      return "Not set";
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  function formatStatus(status) {
    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function statusClasses(status) {
    const map = {
      pending: "bg-amber-50 text-amber-700",
      ongoing: "bg-[var(--brand-100)] text-[var(--brand-700)]",
      completed_pending_approval: "bg-violet-50 text-violet-700",
      completed: "bg-emerald-50 text-emerald-700",
      rejected: "bg-rose-50 text-rose-700",
      cancelled: "bg-slate-100 text-slate-600",
    };

    return map[status] || "bg-slate-100 text-slate-600";
  }

  return (
    <DashboardLayout
      title="Jobs"
      description="Create projects, upload approval documents, and track statuses."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Job List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review projects, their current status, and open the progress page.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
          >
            <Plus className="h-4 w-4" />
            Add Job
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

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Job",
                    "Code",
                    "Start Date",
                    "Created By",
                    "Status",
                    "Action",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-900">
                        {job.title}
                      </p>
                      <p className="mt-1 max-w-[420px] text-sm text-slate-500">
                        {job.description || "No description provided."}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-[var(--brand-700)]">
                      {job.job_code}
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(job.start_date)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {job.created_by_name}
                    </td>
                    <td className="w-[210px] px-6 py-5">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-5 ${statusClasses(
                          job.status
                        )}`}
                        style={{ maxWidth: "190px" }}
                      >
                        {formatStatus(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-700)] transition hover:text-[var(--brand-600)]"
                      >
                        View Progress
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!jobs.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No jobs found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Job</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new project and upload its approval document.
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
                ["job_code", "Job Code"],
                ["title", "Title"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    {label}
                  </span>
                  <input
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
                  rows="4"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["start_date", "Start Date"],
                  ["end_date", "End Date"],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      {label}
                    </span>
                    <input
                      type="date"
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
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Approval Document
                </span>
                <input
                  type="file"
                  onChange={(event) => setApprovalFile(event.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
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
                  disabled={isSubmitting}
                  className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
