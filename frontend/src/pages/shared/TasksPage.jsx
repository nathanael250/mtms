import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Circle,
  FileUp,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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

function getDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

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
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [tasks, setTasks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [reports, setReports] = useState([]);
  const [plannedTasks, setPlannedTasks] = useState([]);
  const [plannedTaskTitle, setPlannedTaskTitle] = useState("");
  const [plannedTaskTime, setPlannedTaskTime] = useState("");
  const [plannedTodoText, setPlannedTodoText] = useState("");
  const [plannedDate, setPlannedDate] = useState(getDateInputValue());
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [completionForm, setCompletionForm] = useState(initialCompletionForm);
  const [completionTask, setCompletionTask] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [isPlannedSubmitting, setIsPlannedSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [activeTab, setActiveTab] = useState("assigned");

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  function goToTaskReport(taskId) {
    navigate(`/reports?task_id=${taskId}`);
  }

  async function loadPageData(keepSelected = true) {
    try {
      let taskEndpoint = "/tasks";
      if (isAdmin) {
        taskEndpoint = "/tasks";
      } else {
        taskEndpoint = `/tasks?assigned_to=${user.id}`;
      }
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

  async function loadPlannedTasks(date = plannedDate) {
    if (isAdmin) {
      setPlannedTasks([]);
      return;
    }

    try {
      const data = await apiFetch(`/daily-tasks?date=${date}`, { token });
      setPlannedTasks(data.tasks || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadPageData(false);
  }, [isAdmin, token, user?.id]);

  useEffect(() => {
    if (activeTab === "planned") {
      loadPlannedTasks(plannedDate);
      setSelectedTaskId(null);
      setReports([]);
    }
  }, [activeTab, isAdmin, token, plannedDate]);

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

  function openReportModal() {
    if (!selectedTask) return;
    setIsReportModalOpen(true);
  }

  function closeReportModal() {
    setIsReportModalOpen(false);
    setReportForm(initialReportForm);
    setIsReportSubmitting(false);
  }

  async function createPlannedTask() {
    const todoItems = plannedTodoText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!plannedTaskTitle.trim()) {
      return;
    }

    setError("");
    setSuccess("");
    setIsPlannedSubmitting(true);

    try {
      await apiFetch("/daily-tasks", {
        method: "POST",
        token,
        body: {
          description: plannedTaskTitle,
          planned_time: plannedTaskTime,
          created_date: plannedDate,
          todo_items: todoItems,
        },
      });
      setPlannedTaskTitle("");
      setPlannedTaskTime("");
      setPlannedTodoText("");
      await loadPlannedTasks(plannedDate);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsPlannedSubmitting(false);
    }
  }

  function handlePlannedTaskKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    createPlannedTask();
  }

  async function handleTogglePlannedTask(taskId) {
    setError("");
    setSuccess("");

    try {
      const data = await apiFetch(`/daily-tasks/${taskId}/toggle`, {
        method: "PATCH",
        token,
      });
      setPlannedTasks((current) =>
        current.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              ...data.task,
              todo_items: (task.todo_items || []).map((item) => ({
                ...item,
                is_completed: data.task.is_completed,
                completed_at: data.task.completed_at,
              })),
            };
          }

          return {
            ...task,
            todo_items: (task.todo_items || []).map((item) =>
              item.id === taskId ? { ...item, ...data.task } : item
            ),
          };
        })
      );
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function handleDeletePlannedTask(taskId) {
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/daily-tasks/${taskId}`, {
        method: "DELETE",
        token,
      });
      setPlannedTasks((current) =>
        current
          .filter((task) => task.id !== taskId)
          .map((task) => ({
            ...task,
            todo_items: (task.todo_items || []).filter((item) => item.id !== taskId),
          }))
      );
    } catch (deleteError) {
      setError(deleteError.message);
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
      closeReportModal();
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

      <div className="grid gap-6">
        <section
          className={`rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm ${
            isAdmin ? "xl:h-[calc(100vh-150px)] xl:overflow-y-auto" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isAdmin ? "Task List" : "My Tasks"}
              </h2>
              {isAdmin ? (
                <p className="mt-1 text-sm text-slate-500">
                  Review created tasks and open the form only when you need to add one.
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Work on assigned tasks or manage your planned tasks.
                </p>
              )}
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

          {!isAdmin && (
            <div className="mt-4 flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab("assigned")}
                className={`px-4 py-3 text-sm font-medium transition ${
                  activeTab === "assigned"
                    ? "border-b-2 border-[var(--brand-600)] text-[var(--brand-600)]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assigned Tasks
              </button>
              <button
                onClick={() => setActiveTab("planned")}
                className={`px-4 py-3 text-sm font-medium transition ${
                  activeTab === "planned"
                    ? "border-b-2 border-[var(--brand-600)] text-[var(--brand-600)]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Planned Tasks
              </button>
            </div>
          )}

          {activeTab === "planned" && !isAdmin ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-700)] shadow-sm">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      Create a daily plan
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Create the planned task, set the time, then list the todo
                      items inside that task.
                    </p>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Planning date
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={(event) => setPlannedDate(event.target.value)}
                      className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100 sm:flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setPlannedDate(getDateInputValue())}
                      className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-700)] transition hover:bg-blue-50"
                    >
                      Today
                    </button>
                  </div>
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Planned time
                  </span>
                  <input
                    type="time"
                    value={plannedTaskTime}
                    onChange={(event) => setPlannedTaskTime(event.target.value)}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Planned task
                  </span>
                  <input
                    value={plannedTaskTitle}
                    onChange={(event) => setPlannedTaskTitle(event.target.value)}
                    onKeyDown={handlePlannedTaskKeyDown}
                    placeholder="Work on the project report"
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Todo list inside this task
                  </span>
                  <textarea
                    value={plannedTodoText}
                    onChange={(event) => setPlannedTodoText(event.target.value)}
                    rows="5"
                    placeholder={"Collect report data\nWrite introduction\nReview numbers"}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="mt-2 block text-xs text-slate-500">
                    Put each todo item on a new line.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={createPlannedTask}
                  disabled={isPlannedSubmitting || !plannedTaskTitle.trim()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {isPlannedSubmitting ? "Adding..." : "Create planned task"}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      Planned checklist
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(plannedDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {
                      plannedTasks.filter(
                        (task) =>
                          task.is_completed ||
                          ((task.todo_items || []).length > 0 &&
                            (task.todo_items || []).every((item) => item.is_completed))
                      ).length
                    } /{" "}
                    {plannedTasks.length} done
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {plannedTasks.map((task) => {
                    const todoItems = task.todo_items || [];
                    const isTaskDone =
                      task.is_completed ||
                      (todoItems.length > 0 &&
                        todoItems.every((item) => item.is_completed));

                    return (
                      <article
                        key={task.id}
                        className={`rounded-2xl border p-4 ${
                          isTaskDone
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleTogglePlannedTask(task.id)}
                            className={`mt-0.5 transition ${
                              isTaskDone
                                ? "text-emerald-600 hover:text-emerald-700"
                                : "text-slate-400 hover:text-[var(--brand-700)]"
                            }`}
                            aria-label="Toggle planned task"
                          >
                            {isTaskDone ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={`text-sm font-bold leading-6 ${
                                  isTaskDone
                                    ? "text-slate-500 line-through"
                                    : "text-slate-900"
                                }`}
                              >
                                {task.description}
                              </p>
                              {task.planned_time ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {String(task.planned_time).slice(0, 5)}
                                </span>
                              ) : null}
                            </div>

                            {todoItems.length ? (
                              <div className="mt-3 space-y-2">
                                {todoItems.map((item) => (
                                  <div key={item.id} className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePlannedTask(item.id)}
                                      className={`mt-0.5 transition ${
                                        item.is_completed
                                          ? "text-emerald-600"
                                          : "text-slate-400 hover:text-[var(--brand-700)]"
                                      }`}
                                      aria-label="Toggle todo item"
                                    >
                                      {item.is_completed ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <Circle className="h-4 w-4" />
                                      )}
                                    </button>
                                    <p
                                      className={`text-sm leading-6 ${
                                        item.is_completed
                                          ? "text-slate-500 line-through"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {item.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">
                                No todo items added inside this task.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePlannedTask(task.id)}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-rose-600"
                            aria-label="Delete planned task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {!plannedTasks.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No planned tasks for this date.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
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
                      !isAdmin ? "Action" : null,
                    ]
                      .filter(Boolean)
                      .map((heading) => (
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
                      {!isAdmin ? (
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              goToTaskReport(task.id);
                            }}
                            className="whitespace-nowrap rounded-xl bg-[var(--brand-700)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-600)]"
                          >
                            Report Task
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {!tasks.length ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 6 : 7}
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
          )}

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

      {isReportModalOpen && selectedTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Add Daily Report
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Document your progress and activities for {selectedTask.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleReportSubmit}>
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
                  required
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReportSubmitting}
                  className="flex-1 rounded-2xl bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isReportSubmitting ? "Submitting..." : "Submit Report"}
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
