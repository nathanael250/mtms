import { useMemo, useState } from "react";
import { CalendarDays, ListTodo, TrendingUp, CheckCheck, AtSign, MessageSquarePlus } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import DashboardStatCard from "../../components/DashboardStatCard";

function toDateKey(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
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

function StaffTaskCalendar({ tasks }) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const leadingDays = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(today);

  const statusStyles = {
    assigned: "border-slate-200 bg-slate-100 text-slate-700",
    ongoing: "border-blue-200 bg-blue-50 text-blue-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
    planned_task: "border-violet-200 bg-violet-50 text-violet-700",
  };
  const statusDots = {
    assigned: "bg-slate-400",
    ongoing: "bg-blue-500",
    completed: "bg-emerald-500",
    cancelled: "bg-rose-500",
    planned_task: "bg-violet-500",
  };

  const tasksByDate = useMemo(
    () =>
      tasks.reduce((accumulator, task) => {
        const key = toDateKey(task.due_date);
        if (!key) {
          return accumulator;
        }
        accumulator[key] = [...(accumulator[key] || []), task];
        return accumulator;
      }, {}),
    [tasks]
  );

  const calendarCells = [
    ...Array.from({ length: leadingDays }, (_, index) => ({
      key: `blank-${index}`,
      day: null,
      tasks: [],
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = toDateKey(new Date(today.getFullYear(), today.getMonth(), day));

      return {
        key,
        day,
        tasks: tasksByDate[key] || [],
      };
    }),
  ];

  const selectedTasks = tasksByDate[selectedDate] || [];

  function getCalendarTone(task) {
    return task.calendar_type === "planned_task" ? "planned_task" : task.status;
  }

  function getDayClasses(cellTasks) {
    if (!cellTasks.length) {
      return "border-slate-200 bg-slate-50/70 hover:border-[var(--brand-300)]";
    }

    if (cellTasks.some((task) => task.calendar_type === "planned_task")) {
      return "border-violet-200 bg-violet-50/80 hover:ring-2 hover:ring-violet-100";
    }

    return "border-emerald-200 bg-emerald-50/70 hover:ring-2 hover:ring-emerald-100";
  }

  return (
    <section className="app-panel relative rounded-none border border-slate-200 border-t-2 border-t-green-500 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">My Task Calendar</h2>
          <p className="mt-1 text-sm text-slate-500">
            See your assigned and planned tasks by date.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-100)] px-3 py-1 text-sm font-semibold text-[var(--brand-700)]">
          <CalendarDays className="h-4 w-4" />
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
        {calendarCells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            disabled={!cell.day}
            onClick={() => cell.day && setSelectedDate(cell.key)}
            className={`min-h-[58px] rounded-xl border p-1.5 text-left transition ${
              !cell.day
                ? "border-transparent bg-transparent"
                : selectedDate === cell.key
                  ? "border-[var(--brand-500)] bg-blue-50 ring-2 ring-blue-100"
                  : getDayClasses(cell.tasks)
            }`}
          >
            {cell.day ? (
              <>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      cell.key === todayKey
                        ? "text-[var(--brand-700)] ring-1 ring-[var(--brand-300)]"
                        : "text-slate-700"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.tasks.length ? (
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 shadow-sm">
                      {cell.tasks.length}
                    </span>
                  ) : null}
                </div>

                {cell.tasks.length ? (
                  <>
                    <div className="mt-1 flex gap-1">
                      {Array.from(new Set(cell.tasks.map(getCalendarTone)))
                        .slice(0, 4)
                        .map((tone) => (
                          <span
                            key={tone}
                            className={`h-1.5 w-1.5 rounded-full ${
                              statusDots[tone] || statusDots.assigned
                            }`}
                          />
                        ))}
                    </div>
                    <p
                      className={`mt-1.5 truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${
                        statusStyles[getCalendarTone(cell.tasks[0])] ||
                        statusStyles.assigned
                      }`}
                    >
                      {cell.tasks[0].title}
                    </p>
                  </>
                ) : null}
              </>
            ) : null}
          </button>
        ))}

        {selectedDate ? (
          <div className="app-panel absolute left-1/2 top-1/2 z-20 w-[min(520px,calc(100%-16px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDate(selectedDate)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTasks.length} assigned task
                  {selectedTasks.length === 1 ? "" : "s"}
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
                        statusStyles[getCalendarTone(task)] || statusStyles.assigned
                      }`}
                    >
                      {task.calendar_type === "planned_task" ? "Planned" : task.status}
                    </span>
                  </div>
                </div>
              ))}
              {!selectedTasks.length ? (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  No assigned tasks on this date.
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
          ["planned_task", "Planned"],
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

export default function StaffDashboardPage({ data, error }) {
  const stats = data?.stats || {};
  const items = [
    ["My Tasks", stats.my_tasks, ListTodo, "blue"],
    ["My Ongoing Tasks", stats.my_ongoing_tasks, TrendingUp, "purple"],
    ["My Completed Tasks", stats.my_completed_tasks, CheckCheck, "rose"],
    ["My Mentions", stats.mentions_assigned_to_me, AtSign, "cyan"],
    ["Mentions I Created", stats.mentions_i_created, MessageSquarePlus, "orange"],
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      description="Track your assigned work, daily progress, and mentions."
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {items.map(([label, value, icon, tone]) => (
          <DashboardStatCard key={label} label={label} value={value} icon={icon} tone={tone} />
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <StaffTaskCalendar tasks={data?.calendarTasks || data?.recentTasks || []} />

        <section className="app-panel rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest assigned work from your jobs.
          </p>
          <div className="mt-4 space-y-3">
            {(data?.recentTasks || []).map((item) => (
              <div
                key={item.id}
                className="app-panel rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {item.job_title}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-[10px] font-bold capitalize text-[var(--brand-700)]">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Due: {formatDate(item.due_date)}
                </p>
              </div>
            ))}
            {!data?.recentTasks?.length ? (
              <p className="text-sm text-slate-500">No recent tasks yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
