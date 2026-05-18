import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Search,
  UsersRound,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value) {
  const date = toDateOnly(value);
  if (!date) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDaysUntil(value) {
  const deadline = toDateOnly(value);
  if (!deadline) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function getTimeLabel(task) {
  if (task.status === "completed") {
    return "Completed";
  }

  const days = getDaysUntil(task.due_date);
  if (days === null) {
    return "No deadline";
  }
  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) {
    return "Due today";
  }

  return `${days} day${days === 1 ? "" : "s"} left`;
}

function getTimeClass(task) {
  if (task.status === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  const days = getDaysUntil(task.due_date);
  if (days === null) {
    return "bg-slate-100 text-slate-600";
  }
  if (days < 0) {
    return "bg-rose-50 text-rose-700";
  }
  if (days <= 3) {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-blue-50 text-blue-700";
}

function getStatusClass(status) {
  const classes = {
    assigned: "bg-slate-100 text-slate-600",
    ongoing: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-rose-50 text-rose-700",
  };

  return classes[status] || "bg-slate-100 text-slate-600";
}

function calculateProgress(tasks) {
  if (!tasks.length) {
    return 0;
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function StatCard({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[8px] ${
            tones[tone] || tones.blue
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
          <p className="text-[12px] font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectWorkflow({ project, isExpanded, onToggle }) {
  const progress = calculateProgress(project.tasks);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-600" />
        )}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="truncate text-sm font-bold text-slate-950">
              {project.title}
            </p>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-700">
              {project.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Deadline: {formatDate(project.end_date)} · {project.tasks.length} task
            {project.tasks.length === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[var(--brand-600)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-700">{progress}%</span>
          </div>
        </div>
        <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 sm:block">
          {getTimeLabel({ due_date: project.end_date, status: project.status })}
        </div>
      </button>

      {isExpanded ? (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3">Employee</th>
                <th className="min-w-[240px] px-5 py-3">Task</th>
                <th className="whitespace-nowrap px-5 py-3">Status</th>
                <th className="whitespace-nowrap px-5 py-3">Deadline</th>
                <th className="whitespace-nowrap px-5 py-3">Time Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {project.tasks.map((task) => (
                <tr key={task.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {task.assigned_to_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Staff member</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{task.title}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusClass(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {formatDate(task.due_date)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${getTimeClass(
                        task
                      )}`}
                    >
                      {getTimeLabel(task)}
                    </span>
                  </td>
                </tr>
              ))}
              {!project.tasks.length ? (
                <tr>
                  <td colSpan="5" className="px-5 py-6 text-center text-sm text-slate-500">
                    No tasks have been added to this project yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkflowPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkflow() {
      setError("");
      setIsLoading(true);

      try {
        const jobsResponse = await apiFetch("/jobs?status=ongoing", { token });
        const jobs = jobsResponse.jobs || [];
        const projectResponses = await Promise.all(
          jobs.map((job) => apiFetch(`/jobs/${job.id}/progress`, { token }))
        );
        const nextProjects = projectResponses.map((response) => ({
          ...response.job,
          tasks: response.tasks || [],
        }));

        setProjects(nextProjects);
        setExpandedProjectIds(nextProjects.slice(0, 1).map((project) => project.id));
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, [token]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects
      .map((project) => ({
        ...project,
        tasks: project.tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(query) ||
            task.assigned_to_name.toLowerCase().includes(query)
        ),
      }))
      .filter(
        (project) =>
          project.title.toLowerCase().includes(query) || project.tasks.length
      );
  }, [projects, searchTerm]);

  const allTasks = projects.flatMap((project) => project.tasks);
  const activeTasks = allTasks.filter((task) => task.status !== "completed");
  const dueTodayTasks = activeTasks.filter((task) => getDaysUntil(task.due_date) === 0);
  const overdueTasks = activeTasks.filter((task) => {
    const days = getDaysUntil(task.due_date);
    return days !== null && days < 0;
  });
  const employeesWorking = new Set(activeTasks.map((task) => task.assigned_to)).size;
  const alerts = [...overdueTasks, ...dueTodayTasks]
    .sort((first, second) => getDaysUntil(first.due_date) - getDaysUntil(second.due_date))
    .slice(0, 6);

  function toggleProject(projectId) {
    setExpandedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  }

  return (
    <DashboardLayout
      title="Workflow"
      description="Track ongoing projects, assigned staff, task deadlines, and time remaining."
    >
      {error ? (
        <div className="mb-6 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search projects, tasks, users..."
            className="w-full rounded-[8px] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-400)] focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          Today: {formatDate(new Date())}
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BriefcaseBusiness}
          label="Ongoing Projects"
          value={projects.length}
          detail="In progress"
          tone="blue"
        />
        <StatCard
          icon={Clock3}
          label="Tasks Due Today"
          value={dueTodayTasks.length}
          detail="Due within 24h"
          tone="orange"
        />
        <StatCard
          icon={AlertCircle}
          label="Overdue Tasks"
          value={overdueTasks.length}
          detail="Past the deadline"
          tone="rose"
        />
        <StatCard
          icon={UsersRound}
          label="Employees Working"
          value={employeesWorking}
          detail="Assigned active tasks"
          tone="emerald"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="text-base font-bold text-slate-950">Project Workflow</h2>
            <p className="mt-1 text-sm text-slate-500">
              See tasks by employee, deadlines, and time remaining.
            </p>
          </div>

          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Loading workflow...
            </div>
          ) : filteredProjects.length ? (
            filteredProjects.map((project) => (
              <ProjectWorkflow
                key={project.id}
                project={project}
                isExpanded={expandedProjectIds.includes(project.id)}
                onToggle={() => toggleProject(project.id)}
              />
            ))
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No ongoing workflow items found.
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">Deadline Alerts</h2>
              <span className="text-xs font-semibold text-[var(--brand-600)]">
                {alerts.length} active
              </span>
            </div>
            <div className="space-y-4">
              {alerts.map((task) => (
                <div key={task.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      getDaysUntil(task.due_date) < 0 ? "bg-rose-500" : "bg-orange-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {task.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {task.assigned_to_name}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold ${getDaysUntil(task.due_date) < 0 ? "text-rose-600" : "text-orange-600"}`}>
                    {getTimeLabel(task)}
                  </span>
                </div>
              ))}
              {!alerts.length ? (
                <p className="text-sm text-slate-500">No urgent deadline alerts.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">Employee Workload</h2>
            <div className="mt-4 overflow-hidden rounded-[8px] border border-slate-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Employee</th>
                    <th className="px-3 py-3">Active</th>
                    <th className="px-3 py-3">Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(
                    allTasks.reduce((map, task) => {
                      const current = map.get(task.assigned_to) || {
                        name: task.assigned_to_name,
                        active: 0,
                        done: 0,
                      };

                      if (task.status === "completed") {
                        current.done += 1;
                      } else {
                        current.active += 1;
                      }

                      map.set(task.assigned_to, current);
                      return map;
                    }, new Map()).values()
                  )
                    .sort((first, second) => second.active - first.active)
                    .slice(0, 6)
                    .map((employee) => (
                      <tr key={employee.name}>
                        <td className="px-3 py-3 font-semibold text-slate-900">
                          {employee.name}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{employee.active}</td>
                        <td className="px-3 py-3 text-slate-600">{employee.done}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}
