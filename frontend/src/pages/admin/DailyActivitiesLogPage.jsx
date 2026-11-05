import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

function pad(value) {
  return String(value).padStart(2, "0");
}

function toYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getPreset(name) {
  const today = new Date();
  if (name === "today") return { from: toYmd(today), to: toYmd(today) };
  if (name === "month") {
    return {
      from: toYmd(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: toYmd(today),
    };
  }
  const start = new Date(today);
  start.setDate(start.getDate() - (name === "30" ? 29 : 6));
  return { from: toYmd(start), to: toYmd(today) };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

// Red: nothing planned. Gray: planned, not everything done yet. Green: all planned work completed.
function getStatus(employee) {
  if (employee.planned === 0) {
    return {
      label: "Not planned",
      badge: "bg-red-100 text-red-700",
      row: "bg-red-50/60 hover:bg-red-50",
      edge: "border-l-red-500",
    };
  }
  if (employee.completed >= employee.planned) {
    return {
      label: "Completed",
      badge: "bg-emerald-100 text-emerald-700",
      row: "bg-emerald-50/60 hover:bg-emerald-50",
      edge: "border-l-emerald-500",
    };
  }
  return {
    label: "Planned",
    badge: "bg-slate-200 text-slate-700",
    row: "bg-slate-50 hover:bg-slate-100",
    edge: "border-l-slate-400",
  };
}

function ProgressBar({ value, color = "bg-blue-600" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

const presets = [
  ["today", "Today"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
  ["month", "This month"],
];

export default function DailyActivitiesLogPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState(getPreset("today"));
  const [activePreset, setActivePreset] = useState("today");
  const [overview, setOverview] = useState(null);
  const [sortBy, setSortBy] = useState("progress");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isReminding, setIsReminding] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiFetch(
          `/daily-tasks/admin/overview?from=${range.from}&to=${range.to}`,
          { token }
        );
        setOverview(data);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    }
    if (range.from && range.to) load();
  }, [token, range]);

  function openEmployee(employee) {
    navigate(`/daily-activities-log/${employee.id}?from=${range.from}&to=${range.to}`);
  }

  const employees = useMemo(() => {
    const list = [...(overview?.employees || [])];
    if (sortBy === "progress") {
      // Completed first, then planned (furthest along first), then not planned.
      const rank = (item) => (item.planned === 0 ? 2 : item.completed >= item.planned ? 0 : 1);
      list.sort(
        (a, b) =>
          rank(a) - rank(b) ||
          b.completion_rate - a.completion_rate ||
          b.planned - a.planned ||
          a.full_name.localeCompare(b.full_name)
      );
    }
    if (sortBy === "completion") list.sort((a, b) => b.completion_rate - a.completion_rate);
    if (sortBy === "activity") list.sort((a, b) => b.days_planned - a.days_planned);
    if (sortBy === "lowest") list.sort((a, b) => a.days_planned - b.days_planned);
    return list;
  }, [overview, sortBy]);

  async function remindOne(employee) {
    if (!window.confirm(`Send a WhatsApp reminder to ${employee.full_name} to add their plan for today?`)) {
      return;
    }
    setReminderMessage("");
    setError("");
    setRemindingId(employee.id);
    try {
      const data = await apiFetch(`/daily-tasks/admin/employee/${employee.id}/remind`, {
        method: "POST",
        token,
      });
      setReminderMessage(data.message);
    } catch (remindError) {
      setError(remindError.message);
    } finally {
      setRemindingId(null);
    }
  }

  async function remindStaff() {
    setReminderMessage("");
    setError("");
    setIsReminding(true);
    try {
      const preview = await apiFetch("/daily-tasks/admin/send-reminders", {
        method: "POST",
        body: { dry_run: true },
        token,
      });
      const targets = preview.results.filter((item) => item.status === "would_send");
      const noPhone = preview.counts.no_phone;

      if (!targets.length) {
        setReminderMessage(
          preview.counts.without_plan
            ? `${noPhone} staff member(s) have no plan today but no phone number saved, so nobody can be reminded.`
            : "Everyone has already planned their day today."
        );
        return;
      }

      const names = targets.map((item) => item.full_name).join(", ");
      if (!window.confirm(`Send a WhatsApp reminder to ${targets.length} staff member(s) who have not planned today?\n\n${names}`)) {
        return;
      }

      const result = await apiFetch("/daily-tasks/admin/send-reminders", {
        method: "POST",
        body: {},
        token,
      });
      const { sent, failed, whatsapp_disabled: disabled } = result.counts;
      setReminderMessage(
        disabled
          ? "WhatsApp notifications are disabled or not configured on the server, so nothing was sent."
          : `Reminder sent to ${sent} staff member(s)${failed ? `, ${failed} failed` : ""}${noPhone ? `, ${noPhone} skipped (no phone number)` : ""}.`
      );
    } catch (remindError) {
      setError(remindError.message);
    } finally {
      setIsReminding(false);
    }
  }

  function applyPreset(name) {
    setActivePreset(name);
    setRange(getPreset(name));
  }

  function changeDate(key, value) {
    setActivePreset("custom");
    setRange((current) => ({ ...current, [key]: value }));
  }

  const totals = overview?.totals;
  const cards = [
    { label: "Employees", value: overview?.employees.length ?? 0, note: `${overview?.working_days ?? 0} working days in range` },
    { label: "Planned tasks", value: totals?.planned ?? 0, note: "Daily plans created" },
    { label: "Completed", value: totals?.completed ?? 0, note: `${totals?.completion_rate ?? 0}% completion` },
    { label: "Not planned", value: overview?.employees.filter((item) => item.planned === 0).length ?? 0, note: "Employees with no daily plan", danger: true },
  ];

  return (
    <DashboardLayout
      title="Daily Activities Log"
      description="See how each employee plans and completes their daily work, with or without active jobs."
    >
      <div className="flex flex-col gap-5">
        <section className="app-panel flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {presets.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`rounded-xl px-4 py-2 text-[13px] font-medium transition ${
                  activePreset === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[["from", "From"], ["to", "To"]].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px] text-slate-500">
                {label}
                <input
                  type="date"
                  value={range[key]}
                  onChange={(event) => changeDate(key, event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={remindStaff}
            disabled={isReminding}
            className="ml-auto rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            {isReminding ? "Checking..." : "Remind staff without a plan today"}
          </button>
          <label className="flex items-center gap-2 text-[13px] text-slate-500">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
            >
              <option value="progress">Progress</option>
              <option value="name">Name</option>
              <option value="completion">Highest completion</option>
              <option value="activity">Most active days</option>
              <option value="lowest">Least active days</option>
            </select>
          </label>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {reminderMessage ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            {reminderMessage}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="app-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={`text-3xl font-bold ${card.danger && card.value ? "text-red-600" : "text-slate-900"}`}>{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{card.label}</p>
              <p className="text-xs text-slate-500">{card.note}</p>
            </div>
          ))}
        </div>

        <section className="app-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Employee performance</h2>
            <p className="text-xs text-slate-500">
              {formatDate(range.from)} – {formatDate(range.to)}. Click an employee to open their page.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Not planned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Planned, not finished
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> All completed
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-3 py-3">Days active</th>
                  <th className="px-3 py-3">Daily tasks done</th>
                  <th className="px-3 py-3">Done late</th>
                  <th className="px-3 py-3">To-dos</th>
                  <th className="px-3 py-3">Job reports</th>
                  <th className="px-3 py-3">Job tasks</th>
                  <th className="px-3 py-3">Last plan</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : employees.length ? (
                  employees.map((employee) => {
                    const status = getStatus(employee);
                    return (
                      <tr
                        key={employee.id}
                        onClick={() => openEmployee(employee)}
                        className={`cursor-pointer transition ${status.row}`}
                      >
                        <td className={`border-l-4 px-5 py-3 ${status.edge}`}>
                          <p className="font-semibold text-slate-900">{employee.full_name}</p>
                          <p className="text-xs text-slate-500">{employee.email}</p>
                        </td>
                        <td className="w-36 px-3 py-3">
                          <p className="text-xs font-medium text-slate-700">
                            {employee.days_planned} / {overview.working_days}
                          </p>
                          <ProgressBar value={employee.activity_rate} />
                        </td>
                        <td className="w-40 px-3 py-3">
                          <p className="text-xs font-medium text-slate-700">
                            {employee.completed} / {employee.planned} ({employee.completion_rate}%)
                          </p>
                          <ProgressBar value={employee.completion_rate} color="bg-emerald-500" />
                        </td>
                        <td className="px-3 py-3 text-slate-600">{employee.completed_late}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {employee.todo_done} / {employee.todo_total}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{employee.reports_submitted}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {employee.job_tasks_completed} done · {employee.job_tasks_active} active
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatDate(employee.last_planned_date)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {employee.planned === 0 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                remindOne(employee);
                              }}
                              disabled={remindingId === employee.id}
                              className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {remindingId === employee.id ? "Sending..." : "Send reminder"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" className="px-5 py-8 text-center text-slate-500">
                      No staff members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </DashboardLayout>
  );
}
