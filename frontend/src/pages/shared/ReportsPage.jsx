import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AtSign, Download, Plus } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { uploadMentionFiles, uploadReportFiles } from "../../lib/uploads";
import FilePicker from "../../components/FilePicker";
import AttachmentLinks from "../../components/AttachmentLinks";

const initialReportForm = {
  report_date: new Date().toISOString().slice(0, 10),
  activity_done: "",
  completed_tasks: "",
  ongoing_tasks: "",
  next_tasks: "",
  location: "",
  comment: "",
  create_mention: false,
  mentioned_user_id: "",
  mention_message: "",
};

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("task_id");
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportFiles, setReportFiles] = useState([]);
  const [mentionFiles, setMentionFiles] = useState([]);
  const selectedTask = tasks.find((task) => String(task.id) === String(taskId));

  async function loadReports() {
    try {
      const params = new URLSearchParams();
      if (user?.role !== "admin") {
        params.set("user_id", user.id);
      }
      if (taskId) {
        params.set("task_id", taskId);
      }

      const endpoint = `/task-reports${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetch(endpoint, { token });
      setReports(data.reports || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    async function loadPageData() {
      try {
        const taskEndpoint =
          user?.role === "admin" ? "/tasks" : `/tasks?assigned_to=${user.id}`;
        const [taskData, staffData] = await Promise.all([
          apiFetch(taskEndpoint, { token }),
          apiFetch("/users/staff", { token }),
        ]);
        setTasks(taskData.tasks || []);
        setStaff(staffData.users || []);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    if (token && user?.id) {
      loadPageData();
    }
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (token && user?.id) {
      loadReports();
    }
  }, [token, user?.id, user?.role, taskId]);

  async function handleReportSubmit(event) {
    event.preventDefault();
    if (!taskId) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const reportResponse = await apiFetch("/task-reports", {
        method: "POST",
        token,
        body: {
          task_id: Number(taskId),
          user_id: user.id,
          report_date: reportForm.report_date,
          activity_done: reportForm.completed_tasks || reportForm.activity_done,
          completed_tasks: reportForm.completed_tasks,
          ongoing_tasks: reportForm.ongoing_tasks,
          next_tasks: reportForm.next_tasks,
          location: reportForm.location,
          comment: reportForm.comment,
        },
      });

      let mentionUploadFailed = false;
      if (reportForm.create_mention) {
        const mentionResponse = await apiFetch("/report-mentions", {
          method: "POST",
          token,
          body: {
            report_id: reportResponse.report.id,
            mentioned_by: user.id,
            mentioned_user_id: Number(reportForm.mentioned_user_id),
            message: reportForm.mention_message,
          },
        });

        if (mentionFiles.length) {
          try {
            await uploadMentionFiles(token, mentionResponse.mention.id, mentionFiles);
          } catch (uploadError) {
            mentionUploadFailed = uploadError.message;
          }
        }
      }

      let uploadFailed = false;
      if (reportFiles.length) {
        try {
          await uploadReportFiles(token, reportResponse.report.id, reportFiles);
        } catch (uploadError) {
          uploadFailed = uploadError.message;
        }
      }

      setReportForm(initialReportForm);
      setReportFiles([]);
      setMentionFiles([]);
      if (uploadFailed || mentionUploadFailed) {
        setError(
          `Report saved, but some files failed to upload: ${uploadFailed || mentionUploadFailed}`
        );
      } else {
        setSuccess(
          reportFiles.length
            ? "Daily report and attachments submitted successfully."
            : "Daily report submitted successfully."
        );
      }
      loadReports();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function exportReport(report) {
    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Task Report - ${escapeHtml(report.task_title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; line-height: 1.55; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .meta { color: #64748b; margin-bottom: 24px; }
            .section { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 14px 0; }
            .label { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; font-weight: 700; margin-bottom: 8px; }
            .text { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Daily Task Report</h1>
          <div class="meta">
            Task: ${escapeHtml(report.task_title)}<br />
            Staff: ${escapeHtml(report.user_name)}<br />
            Date: ${escapeHtml(formatDate(report.report_date))}<br />
            Location: ${escapeHtml(report.location || "No location")}
          </div>
          <div class="section">
            <div class="label">Completed Tasks</div>
            <div class="text">${escapeHtml(report.completed_tasks || report.activity_done || "None")}</div>
          </div>
          <div class="section">
            <div class="label">Ongoing Tasks</div>
            <div class="text">${escapeHtml(report.ongoing_tasks || "None")}</div>
          </div>
          <div class="section">
            <div class="label">Next Tasks</div>
            <div class="text">${escapeHtml(report.next_tasks || "None")}</div>
          </div>
          <div class="section">
            <div class="label">Comment</div>
            <div class="text">${escapeHtml(report.comment || "No comment")}</div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      return;
    }
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <DashboardLayout
      title={user?.role === "admin" ? "Reports Overview" : "My Reports"}
      description={
        user?.role === "admin"
          ? "View daily reports submitted across all jobs and tasks."
          : "Review the daily reports you submitted from your assigned tasks."
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div
        className={
          taskId && user?.role !== "admin"
            ? "grid gap-6 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]"
            : ""
        }
      >
      {taskId && user?.role !== "admin" ? (
        <section className="app-panel rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Report Task
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTask
                  ? `Submit a daily report for ${selectedTask.title}.`
                  : "Submit a daily report for the selected task."}
              </p>
            </div>
            {selectedTask ? (
              <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold text-[var(--brand-700)]">
                {selectedTask.status}
              </span>
            ) : null}
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleReportSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Report Date
              </span>
              <input
                type="date"
                value={reportForm.report_date}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    report_date: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Location
              </span>
              <input
                value={reportForm.location}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Completed Tasks
              </span>
              <textarea
                value={reportForm.completed_tasks}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    completed_tasks: event.target.value,
                  }))
                }
                rows="4"
                placeholder="What did you finish?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Ongoing Tasks
              </span>
              <textarea
                value={reportForm.ongoing_tasks}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    ongoing_tasks: event.target.value,
                  }))
                }
                rows="4"
                placeholder="What is still in progress?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Next Tasks To Work On
              </span>
              <textarea
                value={reportForm.next_tasks}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    next_tasks: event.target.value,
                  }))
                }
                rows="4"
                placeholder="What will you work on next?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Comment
              </span>
              <textarea
                value={reportForm.comment}
                onChange={(event) =>
                  setReportForm((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                rows="3"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
              />
            </label>

            <FilePicker files={reportFiles} onChange={setReportFiles} />

            <div
              className={`app-panel rounded-2xl border p-4 transition ${
                reportForm.create_mention
                  ? "border-violet-300 bg-violet-50 shadow-sm"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-4">
                <input
                  type="checkbox"
                  checked={reportForm.create_mention}
                  onChange={(event) =>
                    setReportForm((current) => ({
                      ...current,
                      create_mention: event.target.checked,
                    }))
                  }
                  className="mt-2 h-4 w-4 rounded border-slate-300 text-[var(--brand-700)] focus:ring-[var(--brand-400)]"
                />
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                    reportForm.create_mention
                      ? "bg-violet-600 text-white"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <AtSign className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-slate-900">
                    Tag a staff member
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    Select this when another employee should receive this report as a mention.
                  </span>
                </span>
              </label>

              {reportForm.create_mention ? (
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Staff member
                    </span>
                    <select
                      value={reportForm.mentioned_user_id}
                      onChange={(event) =>
                        setReportForm((current) => ({
                          ...current,
                          mentioned_user_id: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Select staff</option>
                      {staff
                        .filter((member) => member.id !== user.id)
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Message
                    </span>
                    <textarea
                      value={reportForm.mention_message}
                      onChange={(event) =>
                        setReportForm((current) => ({
                          ...current,
                          mention_message: event.target.value,
                        }))
                      }
                      rows="3"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <FilePicker
                    files={mentionFiles}
                    onChange={setMentionFiles}
                    label="Documents for the tagged staff (optional)"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="app-panel rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Submitted Reports
          </h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {reports.length} report{reports.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="app-table-frame mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="min-w-[190px] px-4 py-4">Task</th>
                  <th className="min-w-[220px] px-4 py-4">Completed</th>
                  <th className="min-w-[180px] px-4 py-4">Ongoing</th>
                  <th className="min-w-[180px] px-4 py-4">Next</th>
                  <th className="whitespace-nowrap px-4 py-4">Date</th>
                  <th className="whitespace-nowrap px-4 py-4">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reports.map((report) => (
                  <tr key={report.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {report.task_title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.user_name} • {report.location || "No location"}
                      </p>
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-4 leading-6 text-slate-600">
                      {report.completed_tasks || report.activity_done || "None"}
                      <AttachmentLinks files={report.attachments} />
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-4 leading-6 text-slate-600">
                      {report.ongoing_tasks || "None"}
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-4 leading-6 text-slate-600">
                      {report.next_tasks || "None"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(report.report_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        onClick={() => exportReport(report)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
                {!reports.length ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No reports found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </DashboardLayout>
  );
}
