import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock3,
  FileText,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardStatCard from "../../components/DashboardStatCard";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

function formatDate(value, withTime = false) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(new Date(value));
}

function SmallBadge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-[var(--brand-100)] text-[var(--brand-700)]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function JobProgressRow({ job, progress, taskSummary }) {
  const statusTone =
    job.status === "completed_pending_approval"
      ? "amber"
      : job.status === "completed"
        ? "green"
        : "blue";

  return (
    <div className="grid gap-4 border-t border-slate-100 px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.8fr)_140px_100px_120px_120px] md:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{job.title}</p>
        <p className="mt-1 text-xs font-medium tracking-[0.12em] text-[var(--brand-700)]">
          {job.job_code}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">{progress}%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${
              progress === 100 ? "bg-emerald-500" : "bg-[var(--brand-600)]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-slate-700">
        <p className="font-semibold">
          {taskSummary.completed} / {taskSummary.total}
        </p>
        <p className="text-xs text-slate-400">completed</p>
      </div>

      <div className="text-sm text-slate-600">{formatDate(job.end_date)}</div>

      <div>
        <SmallBadge tone={statusTone}>
          {job.status === "completed_pending_approval"
            ? "Pending Approval"
            : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </SmallBadge>
      </div>
    </div>
  );
}

function TaskCalendar({ tasks }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const leadingDays = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(today);
  const statusStyles = {
    assigned: "bg-slate-100 text-slate-700 border-slate-200",
    ongoing: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const statusDots = {
    assigned: "bg-slate-400",
    ongoing: "bg-blue-500",
    completed: "bg-emerald-500",
    cancelled: "bg-rose-500",
  };
  const dayStyles = {
    assigned: "border-slate-300 bg-slate-50",
    ongoing: "border-blue-200 bg-blue-50/70",
    completed: "border-emerald-200 bg-emerald-50/70",
    cancelled: "border-rose-200 bg-rose-50/70",
    mixed: "border-violet-200 bg-violet-50/70",
  };

  const tasksByDate = tasks.reduce((accumulator, task) => {
    if (!task.due_date) {
      return accumulator;
    }

    const key = new Date(task.due_date).toISOString().slice(0, 10);
    accumulator[key] = [...(accumulator[key] || []), task];
    return accumulator;
  }, {});

  const calendarCells = [
    ...Array.from({ length: leadingDays }, (_, index) => ({
      key: `blank-${index}`,
      day: null,
      tasks: [],
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = new Date(today.getFullYear(), today.getMonth(), day)
        .toISOString()
        .slice(0, 10);

      return {
        key,
        day,
        tasks: tasksByDate[key] || [],
      };
    }),
  ];

  function getDayTone(cellTasks) {
    if (!cellTasks.length) {
      return "";
    }

    const statuses = new Set(cellTasks.map((task) => task.status));
    return statuses.size === 1 ? [...statuses][0] : "mixed";
  }

  const selectedDateKey = selectedDate;
  const selectedTasks = tasksByDate[selectedDateKey] || [];
  const selectedDateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(selectedDateKey || todayKey));

  return (
    <section className="app-panel relative rounded-none border border-slate-200 border-t-2 border-t-green-500 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-900">
            Task Calendar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            See which tasks should be done on each date.
          </p>
        </div>
        <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-sm font-semibold text-[var(--brand-700)]">
          {monthLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
          <span
            key={day}
            className={index === 0 || index === 6 ? "text-rose-400" : ""}
          >
            {day}
          </span>
        ))}
      </div>

      <div className="relative mt-2 grid grid-cols-7 gap-1.5">
        {calendarCells.map((cell) => {
          const dayTone = getDayTone(cell.tasks);

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => cell.day && setSelectedDate(cell.key)}
              disabled={!cell.day}
              className={`min-h-[58px] rounded-xl border p-1.5 text-left transition ${
                cell.day
                  ? cell.key === selectedDateKey
                    ? "border-[var(--brand-500)] bg-blue-100 shadow-sm ring-2 ring-blue-100"
                    : cell.tasks.length
                      ? `${dayStyles[dayTone]} hover:ring-2 hover:ring-white/80`
                      : "border-slate-200 bg-slate-50/70 hover:border-[var(--brand-300)] hover:bg-blue-50/50"
                  : "border-transparent bg-transparent"
              }`}
            >
            {cell.day ? (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      cell.key === todayKey
                        ? "bg-[var(--brand-600)] text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.tasks.length ? (
                    <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 shadow-sm">
                      {cell.tasks.length}
                    </span>
                  ) : null}
                </div>
                {cell.tasks.length ? (
                  <div className="mt-1 flex gap-1">
                    {Array.from(new Set(cell.tasks.map((task) => task.status)))
                      .slice(0, 4)
                      .map((status) => (
                        <span
                          key={status}
                          className={`h-1.5 w-1.5 rounded-full ${
                            statusDots[status] || statusDots.assigned
                          }`}
                        />
                      ))}
                  </div>
                ) : null}
                <div className="mt-1.5 space-y-1">
                  {cell.tasks.slice(0, 1).map((task) => (
                    <div
                      key={task.id}
                      className={`truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
                        statusStyles[task.status] || statusStyles.assigned
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {cell.tasks.length > 1 ? (
                    <p className="text-[9px] font-semibold text-slate-400">
                      +{cell.tasks.length - 1}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            </button>
          );
        })}

        {selectedDate ? (
          <div className="app-panel absolute left-1/2 top-1/2 z-20 w-[min(520px,calc(100%-16px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedDateLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTasks.length} task
                  {selectedTasks.length === 1 ? "" : "s"} scheduled
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="mt-3 grid max-h-[220px] gap-2 overflow-y-auto">
              {selectedTasks.map((task) => (
                <div key={task.id} className="app-panel rounded-xl bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {task.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {task.job_title}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${
                        statusStyles[task.status] || statusStyles.assigned
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
              {!selectedTasks.length ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No tasks on this date.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {[
          ["assigned", "Assigned"],
          ["ongoing", "Ongoing"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
        ].map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                statusDots[status] || statusDots.assigned
              }`}
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const [dashboardResponse, jobsResponse, tasksResponse, reportsResponse, mentionsResponse] =
        await Promise.all([
          apiFetch("/dashboard/admin", { token }),
          apiFetch("/jobs", { token }),
          apiFetch("/tasks", { token }),
          apiFetch("/task-reports", { token }),
          apiFetch("/report-mentions", { token }),
        ]);

      setData(dashboardResponse);
      setJobs(jobsResponse.jobs || []);
      setTasks(tasksResponse.tasks || []);
      setReports(reportsResponse.reports || []);
      setMentions(mentionsResponse.mentions || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const stats = data?.stats || {};

  const view = useMemo(() => {
    const tasksByJob = tasks.reduce((accumulator, task) => {
      if (!accumulator[task.job_id]) {
        accumulator[task.job_id] = [];
      }
      accumulator[task.job_id].push(task);
      return accumulator;
    }, {});

    const jobsOverview = jobs.slice(0, 3).map((job) => {
      const jobTasks = tasksByJob[job.id] || [];
      const total = jobTasks.length;
      const completed = jobTasks.filter((task) => task.status === "completed").length;
      const ongoing = jobTasks.filter((task) => task.status === "ongoing").length;
      const progress = total
        ? Math.round(((completed + ongoing * 0.5) / total) * 100)
        : 0;

      return {
        job,
        progress,
        taskSummary: { total, completed },
      };
    });

    return {
      jobsOverview,
      pendingApprovals: jobs
        .filter((job) => job.status === "completed_pending_approval")
        .slice(0, 2),
      unreadMentions: mentions.filter((mention) => mention.status === "unread"),
    };
  }, [jobs, tasks, mentions]);

  async function handleApproval(jobId, action) {
    try {
      await apiFetch(`/jobs/${jobId}/${action}`, {
        method: "PATCH",
        token,
        body: {
          approval_comment:
            action === "approve-completion"
              ? "Approved from dashboard."
              : "Rejected from dashboard.",
        },
      });
      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <DashboardLayout
      title="Dashboard"
      description={`Welcome back, ${user?.full_name || "Admin"}`}
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            icon={BriefcaseBusiness}
            label="Total Jobs"
            value={stats.total_jobs}
            hint="All time"
            tone="blue"
          />
          <DashboardStatCard
            icon={TrendingUp}
            label="Ongoing Jobs"
            value={stats.ongoing_jobs}
            hint="In progress"
            tone="purple"
          />
          <DashboardStatCard
            icon={Clock3}
            label="Pending Approval"
            value={stats.jobs_pending_approval}
            hint="Needs your action"
            tone="rose"
          />
          <DashboardStatCard
            icon={CheckCheck}
            label="Completed Jobs"
            value={stats.completed_jobs}
            hint="Approved"
            tone="cyan"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <TaskCalendar tasks={tasks} />

          <div className="space-y-5">
            <section className="app-panel rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-slate-900">
                  Jobs Pending Approval
                </h2>
                <Link to="/jobs" className="text-sm font-medium text-[var(--brand-700)]">
                  View all
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {view.pendingApprovals.map((job) => (
                  <div
                    key={job.id}
                    className="app-panel flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#244974] to-[#3f74b7] text-white">
                      <BriefcaseBusiness className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {job.title}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Marked by: {job.marked_completed_by_name || "Staff"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(job.marked_completed_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleApproval(job.id, "approve-completion")
                        }
                        className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-600"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleApproval(job.id, "reject-completion")
                        }
                        className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {!view.pendingApprovals.length ? (
                  <p className="text-sm text-slate-500">
                    No jobs are waiting for approval.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="app-panel rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-semibold text-slate-900">
                    Unread Mentions
                  </h2>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-50 px-2 text-xs font-semibold text-rose-600">
                    {view.unreadMentions.length}
                  </span>
                </div>
                <Link to="/mentions" className="text-sm font-medium text-[var(--brand-700)]">
                  View all
                </Link>
              </div>
              <div className="mt-4">
                {view.unreadMentions[0] ? (
                  <div>
                    <p className="text-sm leading-7 text-slate-700">
                      {view.unreadMentions[0].message}
                    </p>
                    <p className="mt-4 text-sm text-slate-500">
                      From: {view.unreadMentions[0].mentioned_by_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(view.unreadMentions[0].created_at, true)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No unread mentions.</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="app-panel rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-5">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Recent Reports
              </h2>
              <Link to="/reports" className="text-sm font-medium text-[var(--brand-700)]">
                View all
              </Link>
            </div>
            <div className="grid border-t border-slate-100 px-5 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-400 md:grid-cols-[110px_140px_1.1fr_1.4fr_120px]">
              <span>Date</span>
              <span>Staff</span>
              <span>Task</span>
              <span>Activity</span>
              <span>Location</span>
            </div>
            <div>
              {reports.slice(0, 4).map((report) => (
                <div
                  key={report.id}
                  className="grid border-t border-slate-100 px-5 py-4 text-sm text-slate-600 md:grid-cols-[110px_140px_1.1fr_1.4fr_120px]"
                >
                  <span>{formatDate(report.report_date)}</span>
                  <span>{report.user_name}</span>
                  <span>{report.task_title}</span>
                  <span>{report.activity_done}</span>
                  <span>{report.location || "No location"}</span>
                </div>
              ))}
              {!reports.length ? (
                <div className="px-5 py-8 text-sm text-slate-500">
                  No recent reports yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="app-panel rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Recent Activity
              </h2>
              <Link to="/activity-logs" className="text-sm font-medium text-[var(--brand-700)]">
                View all logs
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              {(data?.recentActivity || []).slice(0, 4).map((item) => {
                const meta =
                  item.action === "job_created"
                    ? { icon: BriefcaseBusiness, tone: "bg-violet-50 text-violet-600" }
                    : item.action === "task_assigned"
                      ? { icon: Activity, tone: "bg-blue-50 text-blue-600" }
                      : item.action === "task_completed"
                        ? { icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" }
                        : { icon: FileText, tone: "bg-amber-50 text-amber-600" };

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                    >
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {item.action.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-sm text-slate-400">
                      {formatDate(item.created_at, true).split(",").pop()?.trim()}
                    </div>
                  </div>
                );
              })}
              {!data?.recentActivity?.length ? (
                <p className="text-sm text-slate-500">No recent activity yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
