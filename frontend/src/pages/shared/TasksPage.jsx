import { useEffect, useState } from "react";
import { FileUp, Plus, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialTaskForm = {
  job_id: "",
  title: "",
  description: "",
  assigned_to: "",
  parent_task_id: "",
  start_date: "",
  due_date: "",
};

const initialReportForm = {
  report_date: new Date().toISOString().slice(0, 10),
  activity_done: "",
  location: "",
  comment: "",
  create_mention: false,
  mentioned_user_id: "",
  mention_message: "",
};

const initialCompletionForm = {
  completion_note: "",
  files: [],
};

function TaskStatusBadge({ status }) {
  return (
    <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold capitalize text-[var(--brand-700)]">
      {status}
    </span>
  );
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

export default function TasksPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tasks, setTasks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [completionForm, setCompletionForm] = useState(initialCompletionForm);
  const [completionTask, setCompletionTask] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  async function loadPageData(keepSelected = true) {
    try {
      const taskEndpoint = isAdmin ? "/tasks" : `/tasks?assigned_to=${user.id}`;
      const [taskData, jobData, staffData] = await Promise.all([
        apiFetch(taskEndpoint, { token }),
        apiFetch("/jobs", { token }),
        apiFetch("/users/staff", { token }),
      ]);

      const nextTasks = taskData.tasks || [];
      setTasks(nextTasks);
      setJobs(jobData.jobs || []);
      setStaff(staffData.users || []);

      const nextSelectedTaskId =
        keepSelected && nextTasks.some((task) => task.id === selectedTaskId)
          ? selectedTaskId
          : nextTasks[0]?.id || null;

      setSelectedTaskId(nextSelectedTaskId);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadReports(taskId) {
    if (!taskId) {
      setReports([]);
      return;
    }

    try {
      const data = await apiFetch(`/task-reports/task/${taskId}`, { token });
      setReports(data.reports || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadPageData(false);
  }, [isAdmin, token, user?.id]);

  useEffect(() => {
    loadReports(selectedTaskId);
  }, [selectedTaskId, token]);

  async function handleCreateTask(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await apiFetch("/tasks", {
        method: "POST",
        token,
        body: {
          ...taskForm,
          job_id: Number(taskForm.job_id),
          assigned_to: Number(taskForm.assigned_to),
          assigned_by: user.id,
          parent_task_id: taskForm.parent_task_id
            ? Number(taskForm.parent_task_id)
            : null,
        },
      });

      setTaskForm(initialTaskForm);
      setIsModalOpen(false);
      setSuccess("Task created successfully.");
      loadPageData(false);
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
    setTaskForm(initialTaskForm);
    setError("");
  }

  async function handleTaskAction(taskId, action) {
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/tasks/${taskId}/${action}`, {
        method: "PATCH",
        token,
      });

      setSuccess("Task started successfully.");
      loadPageData();
      loadReports(taskId);
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  function openCompletionModal(task) {
    setError("");
    setSuccess("");
    setCompletionTask(task);
    setCompletionForm(initialCompletionForm);
  }

  function closeCompletionModal() {
    setCompletionTask(null);
    setCompletionForm(initialCompletionForm);
    setIsCompleting(false);
  }

  async function handleCompleteTask(event) {
    event.preventDefault();
    if (!completionTask) {
      return;
    }

    setError("");
    setSuccess("");
    setIsCompleting(true);

    try {
      await apiFetch(`/tasks/${completionTask.id}/complete`, {
        method: "PATCH",
        token,
        body: {
          completion_note: completionForm.completion_note,
        },
      });

      await Promise.all(
        completionForm.files.map((file) => {
          const formData = new FormData();
          formData.append("related_type", "task");
          formData.append("related_id", completionTask.id);
          formData.append("file", file);

          return apiFetch("/attachments/upload", {
            method: "POST",
            token,
            body: formData,
          });
        })
      );

      setSuccess(
        completionForm.files.length
          ? "Task completed and documents uploaded successfully."
          : "Task completed successfully."
      );
      closeCompletionModal();
      loadPageData();
      loadReports(completionTask.id);
    } catch (completeError) {
      setError(completeError.message);
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    if (!selectedTask) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const reportResponse = await apiFetch("/task-reports", {
        method: "POST",
        token,
        body: {
          task_id: selectedTask.id,
          user_id: user.id,
          report_date: reportForm.report_date,
          activity_done: reportForm.activity_done,
          location: reportForm.location,
          comment: reportForm.comment,
        },
      });

      if (reportForm.create_mention) {
        await apiFetch("/report-mentions", {
          method: "POST",
          token,
          body: {
            report_id: reportResponse.report.id,
            mentioned_by: user.id,
            mentioned_user_id: Number(reportForm.mentioned_user_id),
            message: reportForm.mention_message,
          },
        });
      }

      setReportForm(initialReportForm);
      setSuccess("Daily report submitted successfully.");
      loadReports(selectedTask.id);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <DashboardLayout
      title={isAdmin ? "Tasks" : "My Tasks"}
      description={
        isAdmin
          ? "Assign tasks, create sub-tasks, and monitor execution."
          : "Work on assigned tasks, submit daily reports, and tag another staff member when needed."
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

      <div className={`grid gap-6 ${isAdmin ? "" : "xl:grid-cols-[400px_minmax(0,1fr)]"}`}>
        {isAdmin ? null : (
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Daily Work</h2>
            {selectedTask ? (
              <>
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedTask.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedTask.job_title}
                      </p>
                    </div>
                    <TaskStatusBadge status={selectedTask.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {selectedTask.description || "No task description provided."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTask.status === "assigned" ? (
                      <button
                        type="button"
                        onClick={() => handleTaskAction(selectedTask.id, "start")}
                        className="rounded-xl bg-[var(--brand-700)] px-4 py-2 text-xs font-semibold text-white"
                      >
                        Start Task
                      </button>
                    ) : null}
                    {selectedTask.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => openCompletionModal(selectedTask)}
                        className="rounded-xl border border-[var(--brand-500)] px-4 py-2 text-xs font-semibold text-[var(--brand-700)]"
                      >
                        Mark Completed
                      </button>
                    ) : null}
                  </div>
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleReportSubmit}>
                  <h3 className="text-base font-semibold text-slate-900">
                    Add Daily Report
                  </h3>

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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Activity Done
                    </span>
                    <textarea
                      value={reportForm.activity_done}
                      onChange={(event) =>
                        setReportForm((current) => ({
                          ...current,
                          activity_done: event.target.value,
                        }))
                      }
                      rows="4"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
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
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={reportForm.create_mention}
                      onChange={(event) =>
                        setReportForm((current) => ({
                          ...current,
                          create_mention: event.target.checked,
                        }))
                      }
                    />
                    Tag another staff member from this report
                  </label>

                  {reportForm.create_mention ? (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-600">
                          Mention User
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
                          Mention Message
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
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Submit Daily Report
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                No assigned tasks found yet.
              </p>
            )}
          </section>
        )}

        <section
          className={`rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm ${
            isAdmin ? "xl:h-[calc(100vh-150px)] xl:overflow-y-auto" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isAdmin ? "Task List" : "My Assigned Tasks"}
              </h2>
              {isAdmin ? (
                <p className="mt-1 text-sm text-slate-500">
                  Review created tasks and open the form only when you need to add one.
                </p>
              ) : null}
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Task",
                    "Job",
                    "Assigned To",
                    "Start Date",
                    "Due Date",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80 ${
                      selectedTaskId === task.id ? "bg-[var(--brand-100)]/35" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.description || "No description provided."}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {task.job_title}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {task.assigned_to_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(task.start_date)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(task.due_date)}
                    </td>
                    <td className="px-4 py-4">
                      <TaskStatusBadge status={task.status} />
                    </td>
                  </tr>
                ))}
                {!tasks.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      {isAdmin
                        ? "No tasks created yet."
                        : "You do not have assigned tasks yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!isAdmin && selectedTask ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold text-slate-900">
                Daily Reports for {selectedTask.title}
              </h3>
              <div className="mt-4 space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {report.activity_done}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.report_date} • {report.location || "No location"}
                    </p>
                    {report.comment ? (
                      <p className="mt-2 text-sm text-slate-600">{report.comment}</p>
                    ) : null}
                  </div>
                ))}
                {!reports.length ? (
                  <p className="text-sm text-slate-500">
                    No reports submitted for this task yet.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {completionTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Complete Task
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a completion note and upload supporting documents.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCompletionModal}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {completionTask.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Due {formatDate(completionTask.due_date)}
              </p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCompleteTask}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Completion Note
                </span>
                <textarea
                  value={completionForm.completion_note}
                  onChange={(event) =>
                    setCompletionForm((current) => ({
                      ...current,
                      completion_note: event.target.value,
                    }))
                  }
                  rows="4"
                  placeholder="Describe what was completed."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-400)] focus:bg-white"
                />
              </label>

              <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-[var(--brand-400)] hover:bg-blue-50/40">
                <FileUp className="mx-auto h-6 w-6 text-[var(--brand-600)]" />
                <span className="mt-2 block text-sm font-semibold text-slate-800">
                  Upload completion documents
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  PDF, Word, Excel, images, or MP4 files up to 25MB each.
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.mp4"
                  onChange={(event) =>
                    setCompletionForm((current) => ({
                      ...current,
                      files: Array.from(event.target.files || []),
                    }))
                  }
                  className="sr-only"
                />
              </label>

              {completionForm.files.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Selected documents
                  </p>
                  <div className="mt-3 space-y-2">
                    {completionForm.files.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate text-slate-700">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCompletionModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompleting}
                  className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCompleting ? "Completing..." : "Complete Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAdmin && isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Task</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new task and assign it to a staff member.
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

            <form className="mt-6 space-y-4" onSubmit={handleCreateTask}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Job
                </span>
                <select
                  value={taskForm.job_id}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      job_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="">Select job</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>

              {[
                ["title", "Task Title"],
                ["description", "Description"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    {label}
                  </span>
                  {key === "description" ? (
                    <textarea
                      value={taskForm[key]}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      rows="4"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  ) : (
                    <input
                      value={taskForm[key]}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  )}
                </label>
              ))}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Assign To
                </span>
                <select
                  value={taskForm.assigned_to}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      assigned_to: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="">Select staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["start_date", "Start Date"],
                  ["due_date", "Due Date"],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      {label}
                    </span>
                    <input
                      type="date"
                      value={taskForm[key]}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                ))}
              </div>

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
                  {isSubmitting ? "Saving..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
