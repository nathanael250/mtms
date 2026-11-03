import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  LockOpen,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  MessageSquare,
  Phone,
  Send,
  Trash2,
  Lock,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import AttachmentLinks from "../../components/AttachmentLinks";

function pad(value) {
  return String(value).padStart(2, "0");
}

function toYmd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getPreset(name) {
  const today = new Date();
  if (name === "today") return { from: toYmd(today), to: toYmd(today) };
  const start = new Date(today);
  start.setDate(start.getDate() - (name === "30" ? 29 : 6));
  return { from: toYmd(start), to: toYmd(today) };
}

function previousDay(ymd) {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const avatarColors = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function Avatar({ name, id, size = "h-16 w-16 text-xl" }) {
  const initials =
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size} ${
        avatarColors[Number(id) % avatarColors.length]
      }`}
    >
      {initials}
    </div>
  );
}

const whatsappLabels = {
  sent: { text: "Sent to WhatsApp", className: "text-emerald-600" },
  no_phone: { text: "Saved. No phone number, not sent to WhatsApp", className: "text-amber-600" },
  disabled: { text: "Saved. WhatsApp is turned off on the server", className: "text-amber-600" },
  failed: { text: "Saved. WhatsApp delivery failed", className: "text-red-600" },
};

function CommentList({ comments, onDelete }) {
  if (!comments.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {comments.map((comment) => {
        const status = whatsappLabels[comment.whatsapp_status];
        return (
          <div key={comment.id} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-blue-800">
                {comment.author_name}
                <span className="ml-2 font-normal text-blue-600">{formatDateTime(comment.created_at)}</span>
              </p>
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="text-blue-300 transition hover:text-red-500"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{comment.message}</p>
            {status ? <p className={`mt-1 text-[11px] ${status.className}`}>{status.text}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function CommentBox({ placeholder, onSend }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!message.trim()) return;
    setIsSending(true);
    setError("");
    try {
      await onSend(message.trim());
      setMessage("");
      setIsOpen(false);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Comment
      </button>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows="3"
        maxLength={1000}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isSending || !message.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {isSending ? "Sending..." : "Send to employee's WhatsApp"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setMessage("");
          }}
          className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const presets = [
  ["today", "Today"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
];

export default function EmployeeActivityPage() {
  const { userId } = useParams();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  // Defaults to today unless the overview passed a different range.
  const hasRangeParams = Boolean(searchParams.get("from") && searchParams.get("to"));
  const [range, setRange] = useState(() =>
    hasRangeParams
      ? { from: searchParams.get("from"), to: searchParams.get("to") }
      : getPreset("today")
  );
  const [activePreset, setActivePreset] = useState(() => {
    if (!hasRangeParams) return "today";
    const today = getPreset("today");
    return searchParams.get("from") === today.from && searchParams.get("to") === today.to
      ? "today"
      : "custom";
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [unlockDate, setUnlockDate] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await apiFetch(
        `/daily-tasks/admin/employee/${userId}?from=${range.from}&to=${range.to}`,
        { token }
      );
      setData(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token, range]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  async function sendComment(body) {
    await apiFetch(`/daily-tasks/admin/employee/${userId}/comments`, {
      method: "POST",
      token,
      body,
    });
    await load();
  }

  async function unlockDay(date) {
    setError("");
    setNotice("");
    try {
      await apiFetch(`/daily-tasks/admin/employee/${userId}/unlock`, {
        method: "POST",
        token,
        body: { date },
      });
      setUnlockDate("");
      setNotice(
        `${formatDay(date)} is unlocked. ${data?.employee?.full_name || "The employee"} can now plan, edit, tick tasks and write the day report for it.`
      );
      await load();
    } catch (unlockError) {
      setError(unlockError.message);
    }
  }

  async function lockDay(date) {
    setError("");
    setNotice("");
    try {
      await apiFetch(`/daily-tasks/admin/employee/${userId}/unlock/${date}`, {
        method: "DELETE",
        token,
      });
      setNotice(`${formatDay(date)} is locked again.`);
      await load();
    } catch (lockError) {
      setError(lockError.message);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment? It will disappear for the employee too.")) return;
    try {
      await apiFetch(`/daily-tasks/admin/comments/${commentId}`, { method: "DELETE", token });
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const summary = useMemo(() => {
    const tasks = (data?.days || []).flatMap((day) => day.tasks);
    const done = tasks.filter((task) => task.is_done).length;
    return {
      planned: tasks.length,
      done,
      rate: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      reports: (data?.days || []).filter((day) => day.day_report).length,
    };
  }, [data]);

  const employee = data?.employee;

  return (
    <DashboardLayout
      title="Daily Activities Log"
      description="Review what this employee planned, comment on it, and read their day reports."
    >
      <div className="flex flex-col gap-5">
        <Link
          to="/daily-activities-log"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={14} />
          Back to Daily Activities Log
        </Link>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        ) : null}

        {employee ? (
          <section className="app-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-5">
              <Avatar name={employee.full_name} id={employee.id} />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-900">{employee.full_name}</h2>
                <p className="text-sm text-slate-500">{employee.email}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3.5 w-3.5" />
                  {employee.phone || (
                    <span className="font-medium text-amber-600">
                      No phone number saved. Comments will not reach WhatsApp.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-6 text-center">
                {[
                  ["Planned", summary.planned],
                  ["Completed", summary.done],
                  ["Completion", `${summary.rate}%`],
                  ["Day reports", summary.reports],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {presets.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActivePreset(key);
                    setRange(getPreset(key));
                  }}
                  className={`rounded-xl px-4 py-2 text-[13px] font-medium transition ${
                    activePreset === key
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
              {[["from", "From"], ["to", "To"]].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-[13px] text-slate-500">
                  {label}
                  <input
                    type="date"
                    value={range[key]}
                    onChange={(event) => {
                      setActivePreset("custom");
                      setRange((current) => ({ ...current, [key]: event.target.value }));
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
                  />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {employee ? (
          <section className="app-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <LockOpen className="h-4 w-4 text-blue-600" />
              Reopen a day
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Past days are locked. Pick a day and unlock it so {employee.full_name} can plan, edit,
              tick tasks and write the day report for it. The day closes again as soon as they
              submit the report, or you can lock it yourself.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={unlockDate}
                max={data?.today ? previousDay(data.today) : undefined}
                onChange={(event) => setUnlockDate(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => unlockDate && unlockDay(unlockDate)}
                disabled={!unlockDate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                <LockOpen className="h-3.5 w-3.5" />
                Override: unlock this day
              </button>
            </div>
            {data?.unlocked_days?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.unlocked_days.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                  >
                    <LockOpen className="h-3 w-3" />
                    {formatDay(date)}
                    <button
                      type="button"
                      onClick={() => lockDay(date)}
                      className="font-semibold text-amber-900 underline"
                    >
                      Lock again
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}

        {data && !data.days.length ? (
          <div className="app-panel rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-4 py-10 text-center text-sm text-red-600">
            {employee.full_name} has not planned any tasks {activePreset === "today" ? "today" : "in this period"}.
          </div>
        ) : null}

        {data?.days.map((day) => {
          const allDone = day.tasks.length > 0 && day.tasks.every((task) => task.is_done);
          const dayBadge = !day.tasks.length
            ? { text: "No plan", className: "bg-red-100 text-red-700" }
            : allDone
              ? { text: "Completed", className: "bg-emerald-100 text-emerald-700" }
              : { text: "Planned", className: "bg-slate-200 text-slate-700" };

          return (
            <section key={day.date} className="app-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">{formatDay(day.date)}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {day.unlocked ? (
                    <button
                      type="button"
                      onClick={() => lockDay(day.date)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      <Lock className="h-3 w-3" />
                      Unlocked: lock again
                    </button>
                  ) : day.date < data.today ? (
                    <button
                      type="button"
                      onClick={() => unlockDay(day.date)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <LockOpen className="h-3 w-3" />
                      Unlock for editing
                    </button>
                  ) : null}
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dayBadge.className}`}>
                    {dayBadge.text}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {day.tasks.map((task) => (
                  <article
                    key={task.id}
                    className={`rounded-xl border border-l-4 p-4 ${
                      task.is_done
                        ? "border-emerald-100 border-l-emerald-500 bg-emerald-50/60"
                        : "border-slate-100 border-l-slate-400 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {task.is_done ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {task.description}
                          {task.planned_time ? (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                              <Clock3 className="h-3 w-3" />
                              {task.planned_time.slice(0, 5)}
                            </span>
                          ) : null}
                        </p>
                        {task.todo_items.length ? (
                          <div className="mt-2 space-y-1">
                            {task.todo_items.map((todo) => (
                              <p
                                key={todo.id}
                                className={`flex items-start gap-1.5 text-sm ${
                                  todo.is_completed ? "text-slate-400 line-through" : "text-slate-700"
                                }`}
                              >
                                {todo.is_completed ? (
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : (
                                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                                )}
                                {todo.description}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        <CommentList comments={task.comments} onDelete={deleteComment} />
                        <CommentBox
                          placeholder="Write a comment about this task..."
                          onSend={(message) => sendComment({ daily_task_id: task.id, message })}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div
                className={`mt-4 rounded-xl border p-4 ${
                  day.day_report ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50"
                }`}
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  Day report
                  {day.day_report ? (
                    <span className="font-normal normal-case text-emerald-600">
                      submitted {formatDateTime(day.day_report.submitted_at)}
                    </span>
                  ) : null}
                </p>
                {day.day_report ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{day.day_report.summary}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No day report submitted yet.</p>
                )}
                <AttachmentLinks files={day.files} />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Comments on this day
                </p>
                <CommentList comments={day.day_comments} onDelete={deleteComment} />
                <CommentBox
                  placeholder="Write a comment about this day..."
                  onSend={(message) => sendComment({ date: day.date, message })}
                />
              </div>
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
