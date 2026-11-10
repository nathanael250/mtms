import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Clock3,
  Circle,
  FileUp,
  ListChecks,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import {
  ACCEPTED_FILE_TYPES,
  getUploadUrl,
  uploadMentionFiles,
  uploadReportFiles,
} from "../../lib/uploads";
import FilePicker from "../../components/FilePicker";
import AttachmentLinks from "../../components/AttachmentLinks";

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
  const [plannedTag, setPlannedTag] = useState({ on: false, userId: "", message: "" });
  const [cardTag, setCardTag] = useState(null); // { taskId, userId, message }
  const [isTagging, setIsTagging] = useState(false);
  const [carryingId, setCarryingId] = useState(null);
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
  const [isPlannedToday, setIsPlannedToday] = useState(true);
  const [canEditPlanned, setCanEditPlanned] = useState(true);
  const [dayComments, setDayComments] = useState([]);
  const [reportFiles, setReportFiles] = useState([]);
  const [mentionFiles, setMentionFiles] = useState([]);
  const [dayFiles, setDayFiles] = useState([]);
  const [isUploadingDayFile, setIsUploadingDayFile] = useState(false);
  const [dayReport, setDayReport] = useState(null);
  const [daySummary, setDaySummary] = useState("");
  const [isSavingDayReport, setIsSavingDayReport] = useState(false);
  const [editingPlanned, setEditingPlanned] = useState(null);
  const [isSavingPlanned, setIsSavingPlanned] = useState(false);

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

  // No date means today; the server decides what today is.
  async function loadPlannedTasks(date) {
    if (isAdmin) {
      setPlannedTasks([]);
      return;
    }

    try {
      const data = await apiFetch(
        date ? `/daily-tasks?date=${date}` : "/daily-tasks",
        { token }
      );
      setPlannedDate(data.date);
      setIsPlannedToday(data.is_today);
      setCanEditPlanned(data.is_editable);
      setPlannedTasks(data.tasks || []);
      setDayComments(data.comments || []);
      setDayReport(data.day_report || null);
      setDayFiles(data.day_files || []);
      setDaySummary(data.day_report?.summary || "");
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  // Marks a task to continue on the next day (or removes the mark). Only possible while
  // the day is open, so the choice has to be made on the day itself.
  async function handleToggleCarryOver(task) {
    setError("");
    setSuccess("");
    setCarryingId(task.id);
    try {
      const data = await apiFetch(`/daily-tasks/${task.id}/carry-over`, {
        method: "PATCH",
        token,
        body: { carry_over: !task.carry_over },
      });
      setPlannedTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, carry_over: data.carry_over ? 1 : 0 } : item
        )
      );
      setSuccess(data.message);
    } catch (carryError) {
      setError(carryError.message);
    } finally {
      setCarryingId(null);
    }
  }

  useEffect(() => {
    loadPageData(false);
  }, [isAdmin, token, user?.id]);

  useEffect(() => {
    if (activeTab === "planned") {
      loadPlannedTasks();
      setSelectedTaskId(null);
      setReports([]);
    }
  }, [activeTab, isAdmin, token]);

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
    setReportFiles([]);
    setMentionFiles([]);
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

    if (plannedTag.on && (!plannedTag.userId || !plannedTag.message.trim())) {
      setError("To ask for help, choose a staff member and write what you need.");
      setIsPlannedSubmitting(false);
      return;
    }

    try {
      const created = await apiFetch("/daily-tasks", {
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

      if (plannedTag.on) {
        try {
          await apiFetch("/report-mentions/planned", {
            method: "POST",
            token,
            body: {
              daily_task_id: created.task.id,
              mentioned_user_id: Number(plannedTag.userId),
              message: plannedTag.message.trim(),
            },
          });
          setSuccess("Planned task created and your help request was sent.");
        } catch (tagError) {
          setError(`Planned task created, but the help request failed: ${tagError.message}`);
        }
        setPlannedTag({ on: false, userId: "", message: "" });
      }
      await loadPlannedTasks(plannedDate);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsPlannedSubmitting(false);
    }
  }

  async function sendCardTag() {
    if (!cardTag || !cardTag.userId || !cardTag.message.trim()) {
      setError("Choose a staff member and write what you need.");
      return;
    }
    setError("");
    setSuccess("");
    setIsTagging(true);
    try {
      await apiFetch("/report-mentions/planned", {
        method: "POST",
        token,
        body: {
          daily_task_id: cardTag.taskId,
          mentioned_user_id: Number(cardTag.userId),
          message: cardTag.message.trim(),
        },
      });
      setCardTag(null);
      setSuccess("Help request sent.");
      await loadPlannedTasks(plannedDate);
    } catch (tagError) {
      setError(tagError.message);
    } finally {
      setIsTagging(false);
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

  // Moves one planned task (or one to-do inside a task) to a new position.
  // `parentId` is null for planned tasks, or the task id for its to-dos.
  // `target` is "top", "up" or "down".
  async function handleMoveItem(parentId, itemId, target) {
    const list =
      parentId === null
        ? plannedTasks
        : plannedTasks.find((task) => task.id === parentId)?.todo_items || [];
    const from = list.findIndex((item) => item.id === itemId);
    if (from < 0) return;

    const to = target === "top" ? 0 : target === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= list.length || to === from) return;

    const reordered = [...list];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    setError("");
    setSuccess("");
    setPlannedTasks((current) =>
      parentId === null
        ? reordered
        : current.map((task) =>
            task.id === parentId ? { ...task, todo_items: reordered } : task
          )
    );

    try {
      await apiFetch("/daily-tasks/reorder", {
        method: "PUT",
        token,
        body: { ids: reordered.map((item) => item.id) },
      });
    } catch (moveError) {
      setError(moveError.message);
      loadPlannedTasks(plannedDate);
    }
  }

  function MoveButtons({ parentId, itemId, index, count, size = "h-4 w-4" }) {
    if (!canEditPlanned || count < 2) return null;
    const base =
      "rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-[var(--brand-700)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400";
    return (
      <span className="inline-flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => handleMoveItem(parentId, itemId, "top")}
          disabled={index === 0}
          className={base}
          aria-label="Move to first place"
          title="Move to first place"
        >
          <ChevronsUp className={size} />
        </button>
        <button
          type="button"
          onClick={() => handleMoveItem(parentId, itemId, "up")}
          disabled={index === 0}
          className={base}
          aria-label="Move up"
          title="Move up"
        >
          <ChevronUp className={size} />
        </button>
        <button
          type="button"
          onClick={() => handleMoveItem(parentId, itemId, "down")}
          disabled={index === count - 1}
          className={base}
          aria-label="Move down"
          title="Move down"
        >
          <ChevronDown className={size} />
        </button>
      </span>
    );
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

  function openPlannedEdit(task) {
    setEditingPlanned({
      id: task.id,
      description: task.description || "",
      planned_time: task.planned_time ? String(task.planned_time).slice(0, 5) : "",
      todos: (task.todo_items || []).map((item) => ({
        id: item.id,
        description: item.description,
      })),
    });
  }

  async function handleSavePlannedEdit(event) {
    event.preventDefault();
    if (!editingPlanned.description.trim()) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingPlanned(true);

    try {
      await apiFetch(`/daily-tasks/${editingPlanned.id}`, {
        method: "PUT",
        token,
        body: {
          description: editingPlanned.description,
          planned_time: editingPlanned.planned_time,
          todo_items: editingPlanned.todos,
        },
      });
      setEditingPlanned(null);
      setSuccess("Planned task updated.");
      await loadPlannedTasks(plannedDate);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingPlanned(false);
    }
  }

  // Refreshes only the file list so text the employee is still typing is kept.
  async function refreshDayFiles() {
    const data = await apiFetch(`/daily-tasks?date=${plannedDate}`, { token });
    setDayFiles(data.day_files || []);
  }

  async function handleDayFilesPicked(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (!picked.length) {
      return;
    }

    setError("");
    setSuccess("");
    setIsUploadingDayFile(true);

    try {
      for (const file of picked) {
        const formData = new FormData();
        formData.append("related_type", "report");
        formData.append("date", plannedDate);
        formData.append("file", file);
        await apiFetch("/daily-tasks/day-report/files", {
          method: "POST",
          token,
          body: formData,
        });
      }
      await refreshDayFiles();
    } catch (uploadError) {
      setError(uploadError.message);
      await refreshDayFiles().catch(() => {});
    } finally {
      setIsUploadingDayFile(false);
    }
  }

  async function handleDeleteDayFile(fileId) {
    setError("");
    try {
      await apiFetch(`/daily-tasks/day-report/files/${fileId}`, {
        method: "DELETE",
        token,
      });
      await refreshDayFiles();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleSaveDayReport() {
    if (
      !isPlannedToday &&
      !window.confirm(
        "Submitting the day report closes this day again. You will not be able to change your tasks, files or report afterwards unless your admin reopens it.\n\nSubmit now?"
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingDayReport(true);

    try {
      const data = await apiFetch("/daily-tasks/day-report", {
        method: "PUT",
        token,
        body: { date: plannedDate, summary: daySummary },
      });
      setSuccess(
        data.closed
          ? "Day report submitted. This day is now closed."
          : "Day report saved. Your admin can now read it."
      );
      await loadPlannedTasks(plannedDate);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingDayReport(false);
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
          className={`app-panel rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm ${
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
              <div className="app-panel rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand-700)] shadow-sm">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {isPlannedToday
                        ? "Create a daily plan"
                        : canEditPlanned
                          ? "This day is unlocked"
                          : "Viewing another day"}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {isPlannedToday
                        ? "Create the planned task, set the time, then list the todo items inside that task."
                        : canEditPlanned
                          ? "Your admin reopened this day. Add or update your plan, tick what you finished, and write the day report. The day closes again when you submit the report."
                          : "You can look at what you planned on other dates, but you can only plan and change tasks on the day itself."}
                    </p>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Date
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="date"
                      value={plannedDate}
                      onChange={(event) =>
                        event.target.value && loadPlannedTasks(event.target.value)
                      }
                      className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100 sm:flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => loadPlannedTasks()}
                      disabled={isPlannedToday}
                      className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-700)] transition hover:bg-blue-50 disabled:cursor-default disabled:opacity-50"
                    >
                      Today
                    </button>
                  </div>
                  <span className="mt-2 block text-xs text-slate-500">
                    {isPlannedToday
                      ? "Planned tasks lock at midnight."
                      : canEditPlanned
                        ? "Unlocked by your admin. You can complete this day."
                        : "Read-only: this is not today."}
                  </span>
                </label>

                {canEditPlanned ? (
                  <>
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

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={plannedTag.on}
                    onChange={(event) =>
                      setPlannedTag((current) => ({ ...current, on: event.target.checked }))
                    }
                  />
                  Ask another staff member for help on this task
                </label>
                {plannedTag.on ? (
                  <div className="app-panel mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <select
                      value={plannedTag.userId}
                      onChange={(event) =>
                        setPlannedTag((current) => ({ ...current, userId: event.target.value }))
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
                    <textarea
                      value={plannedTag.message}
                      onChange={(event) =>
                        setPlannedTag((current) => ({ ...current, message: event.target.value }))
                      }
                      rows="3"
                      maxLength={2000}
                      placeholder="What do you need help with?"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      They get a WhatsApp message and see it under Mentions, where they can resolve it.
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={createPlannedTask}
                  disabled={isPlannedSubmitting || !plannedTaskTitle.trim()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {isPlannedSubmitting ? "Adding..." : "Create planned task"}
                </button>
                  </>
                ) : null}
              </div>

              <div className="app-panel rounded-2xl border border-slate-200 bg-white p-5">
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

                {dayComments.filter((comment) => !comment.daily_task_id).length ? (
                  <div className="mt-4 space-y-2">
                    {dayComments
                      .filter((comment) => !comment.daily_task_id)
                      .map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3"
                        >
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {comment.author_name} commented on this day
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                            {comment.message}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {plannedTasks.map((task, taskIndex) => {
                    const todoItems = task.todo_items || [];
                    const isTaskDone =
                      task.is_completed ||
                      (todoItems.length > 0 &&
                        todoItems.every((item) => item.is_completed));

                    return (
                      <article
                        key={task.id}
                        className={`app-panel rounded-2xl border p-4 ${
                          isTaskDone
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleTogglePlannedTask(task.id)}
                            disabled={!canEditPlanned}
                            className={`mt-0.5 transition disabled:cursor-default ${
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
                                {todoItems.map((item, itemIndex) => (
                                  <div key={item.id} className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePlannedTask(item.id)}
                                      disabled={!canEditPlanned}
                                      className={`mt-0.5 transition disabled:cursor-default ${
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
                                    <span className="ml-auto">
                                      <MoveButtons
                                        parentId={task.id}
                                        itemId={item.id}
                                        index={itemIndex}
                                        count={todoItems.length}
                                        size="h-3.5 w-3.5"
                                      />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">
                                No todo items added inside this task.
                              </p>
                            )}

                            {task.carried_from_date ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                Continued from {formatDate(task.carried_from_date)}
                              </p>
                            ) : null}
                            {task.carried_to_id ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                Carried over to a later day
                              </p>
                            ) : canEditPlanned && !isTaskDone ? (
                              <button
                                type="button"
                                onClick={() => handleToggleCarryOver(task)}
                                disabled={carryingId === task.id}
                                className={`mt-3 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                                  task.carry_over
                                    ? "border-amber-300 bg-amber-100 text-amber-900"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {task.carry_over
                                  ? "Will continue tomorrow (click to undo)"
                                  : "Continue tomorrow"}
                              </button>
                            ) : task.carry_over ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                Marked to continue on the next day
                              </p>
                            ) : null}

                            {(task.mentions || []).map((mention) => (
                              <div
                                key={mention.id}
                                className={`mt-3 rounded-xl border px-3 py-2 ${
                                  mention.status === "resolved"
                                    ? "border-emerald-100 bg-emerald-50"
                                    : "border-amber-100 bg-amber-50"
                                }`}
                              >
                                <p className="text-xs font-semibold text-slate-700">
                                  Help asked from {mention.mentioned_user_name} ·{" "}
                                  {mention.status === "resolved" ? "Resolved" : "Waiting"}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                  {mention.message}
                                </p>
                                {mention.status === "resolved" ? (
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-800">
                                    Reply: {mention.resolution_message || "Marked as resolved."}
                                  </p>
                                ) : null}
                              </div>
                            ))}

                            {canEditPlanned ? (
                              cardTag?.taskId === task.id ? (
                                <div className="app-panel mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                                  <select
                                    value={cardTag.userId}
                                    onChange={(event) =>
                                      setCardTag((current) => ({ ...current, userId: event.target.value }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
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
                                  <textarea
                                    value={cardTag.message}
                                    onChange={(event) =>
                                      setCardTag((current) => ({ ...current, message: event.target.value }))
                                    }
                                    rows="2"
                                    maxLength={2000}
                                    placeholder="What do you need help with?"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={sendCardTag}
                                      disabled={isTagging}
                                      className="rounded-xl bg-[var(--brand-700)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                    >
                                      {isTagging ? "Sending..." : "Send request"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCardTag(null)}
                                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCardTag({ taskId: task.id, userId: "", message: "" })}
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Ask for help
                                </button>
                              )
                            ) : null}

                            {dayComments
                              .filter((comment) => comment.daily_task_id === task.id)
                              .map((comment) => (
                                <div
                                  key={comment.id}
                                  className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"
                                >
                                  <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    {comment.author_name}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                                    {comment.message}
                                  </p>
                                </div>
                              ))}
                          </div>
                          {canEditPlanned ? (
                            <>
                          <MoveButtons
                            parentId={null}
                            itemId={task.id}
                            index={taskIndex}
                            count={plannedTasks.length}
                          />
                          <button
                            type="button"
                            onClick={() => openPlannedEdit(task)}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-[var(--brand-700)]"
                            aria-label="Edit planned task"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlannedTask(task.id)}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-rose-600"
                            aria-label="Delete planned task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}

                  {!plannedTasks.length ? (
                    <div className="app-panel rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No planned tasks for this date.
                    </div>
                  ) : null}
                </div>

                <div
                  className={`mt-5 rounded-2xl border p-4 ${
                    dayReport
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Finish the day: report
                    </h4>
                    {dayReport ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Submitted
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Not submitted
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {canEditPlanned
                      ? `Explain how the work was done on ${formatDate(plannedDate)}.`
                      : `Report for ${formatDate(plannedDate)}.`}
                  </p>
                  {!canEditPlanned ? (
                    <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                      {dayReport ? dayReport.summary : "No report was submitted for this day."}
                    </p>
                  ) : null}
                  {!canEditPlanned ? <AttachmentLinks files={dayFiles} /> : null}
                  {canEditPlanned ? (
                  <>
                  <textarea
                    value={daySummary}
                    onChange={(event) => setDaySummary(event.target.value)}
                    rows="5"
                    maxLength={5000}
                    placeholder="What did you finish, how did you do it, and what is still pending?"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100"
                  />
                  {!isPlannedToday ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Attach your files first. Submitting the report closes this day again.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      <Paperclip className="h-3.5 w-3.5" />
                      {isUploadingDayFile ? "Uploading..." : "Attach files"}
                      <input
                        type="file"
                        multiple
                        accept={ACCEPTED_FILE_TYPES}
                        onChange={handleDayFilesPicked}
                        disabled={isUploadingDayFile}
                        className="sr-only"
                      />
                    </label>
                    <span className="ml-3 text-xs text-slate-500">
                      Files are saved as soon as you pick them.
                    </span>
                    {dayFiles.length ? (
                      <div className="mt-2 space-y-1.5">
                        {dayFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                          >
                            <a
                              href={getUploadUrl(file.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[var(--brand-700)] hover:underline"
                            >
                              {file.file_name}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDayFile(file.id)}
                              className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                              aria-label={`Remove ${file.file_name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDayReport}
                    disabled={isSavingDayReport || !daySummary.trim()}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand-700)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingDayReport
                      ? "Saving..."
                      : isPlannedToday
                        ? dayReport
                          ? "Update day report"
                          : "Submit day report"
                        : dayReport
                          ? "Resubmit and close day"
                          : "Submit day report and close day"}
                  </button>
                  </>
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
          <div className="app-panel w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
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

            <div className="app-panel mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
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
                <div className="app-panel rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Selected documents
                  </p>
                  <div className="mt-3 space-y-2">
                    {completionForm.files.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="app-panel flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
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
          <div className="app-panel w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
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
                <div className="app-panel space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                  <FilePicker
                    files={mentionFiles}
                    onChange={setMentionFiles}
                    label="Documents for the tagged staff (optional)"
                  />
                </div>
              ) : null}

              <FilePicker files={reportFiles} onChange={setReportFiles} />

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
          <div className="app-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
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
      {editingPlanned ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <form
            onSubmit={handleSavePlannedEdit}
            className="app-panel max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Edit planned task</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Change the task, its time, or the to-do items inside it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlanned(null)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Planned task</span>
              <input
                value={editingPlanned.description}
                onChange={(event) =>
                  setEditingPlanned((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--brand-500)] focus:bg-white"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-600">Planned time</span>
              <input
                type="time"
                value={editingPlanned.planned_time}
                onChange={(event) =>
                  setEditingPlanned((current) => ({ ...current, planned_time: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--brand-500)] focus:bg-white"
              />
            </label>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-medium text-slate-600">To-do items</span>
              <div className="space-y-2">
                {editingPlanned.todos.map((todo, index) => (
                  <div key={todo.id || `new-${index}`} className="flex gap-2">
                    <input
                      value={todo.description}
                      onChange={(event) =>
                        setEditingPlanned((current) => ({
                          ...current,
                          todos: current.todos.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: event.target.value } : item
                          ),
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[var(--brand-500)] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPlanned((current) => ({
                          ...current,
                          todos: current.todos.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                      aria-label="Remove to-do item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingPlanned((current) => ({
                    ...current,
                    todos: [...current.todos, { description: "" }],
                  }))
                }
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to-do item
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPlanned(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPlanned || !editingPlanned.description.trim()}
                className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSavingPlanned ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
