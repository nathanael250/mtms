import { useEffect, useMemo, useState } from "react";
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

function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${tone.bg}`}
        >
          <Icon className={`h-6 w-6 ${tone.text}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-slate-900">
            {value ?? 0}
          </p>
          <p className="mt-2 text-sm text-slate-400">{hint}</p>
        </div>
      </div>
    </div>
  );
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
        <div className="grid gap-4 xl:grid-cols-4">
          <StatCard
            icon={BriefcaseBusiness}
            label="Total Jobs"
            value={stats.total_jobs}
            hint="All time"
            tone={{ bg: "bg-[var(--brand-100)]", text: "text-[var(--brand-700)]" }}
          />
          <StatCard
            icon={TrendingUp}
            label="Ongoing Jobs"
            value={stats.ongoing_jobs}
            hint="In progress"
            tone={{ bg: "bg-emerald-50", text: "text-emerald-600" }}
          />
          <StatCard
            icon={Clock3}
            label="Pending Approval"
            value={stats.jobs_pending_approval}
            hint="Needs your action"
            tone={{ bg: "bg-amber-50", text: "text-amber-600" }}
          />
          <StatCard
            icon={CheckCheck}
            label="Completed Jobs"
            value={stats.completed_jobs}
            hint="Approved"
            tone={{ bg: "bg-violet-50", text: "text-violet-600" }}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-5">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Jobs Overview
              </h2>
              <button className="text-sm font-medium text-[var(--brand-700)]">
                View all jobs
              </button>
            </div>
            <div className="grid border-t border-slate-100 px-5 py-3 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-400 md:grid-cols-[minmax(0,1.8fr)_140px_100px_120px_120px]">
              <span>Job / Project</span>
              <span>Progress</span>
              <span>Tasks</span>
              <span>End Date</span>
              <span>Status</span>
            </div>
            <div>
              {view.jobsOverview.map((item) => (
                <JobProgressRow
                  key={item.job.id}
                  job={item.job}
                  progress={item.progress}
                  taskSummary={item.taskSummary}
                />
              ))}
              {!view.jobsOverview.length ? (
                <div className="px-5 py-8 text-sm text-slate-500">
                  No jobs overview data yet.
                </div>
              ) : null}
            </div>
            <div className="px-5 py-5 text-center">
              <button className="text-sm font-medium text-[var(--brand-700)]">
                View all jobs
              </button>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-slate-900">
                  Jobs Pending Approval
                </h2>
                <button className="text-sm font-medium text-[var(--brand-700)]">
                  View all
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {view.pendingApprovals.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
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

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-semibold text-slate-900">
                    Unread Mentions
                  </h2>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-50 px-2 text-xs font-semibold text-rose-600">
                    {view.unreadMentions.length}
                  </span>
                </div>
                <button className="text-sm font-medium text-[var(--brand-700)]">
                  View all
                </button>
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
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-5">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Recent Reports
              </h2>
              <button className="text-sm font-medium text-[var(--brand-700)]">
                View all
              </button>
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-slate-900">
                Recent Activity
              </h2>
              <button className="text-sm font-medium text-[var(--brand-700)]">
                View all logs
              </button>
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

