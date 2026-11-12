import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import ReplyBox from "../../components/CommentReplyBox";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(ymd) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ymd}T00:00:00Z`));
}

// Staff inbox for what admins wrote on their plans, with the reply box right under each one.
export default function CommentsPage() {
  const { token, user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await apiFetch("/daily-tasks/my-comments", { token });
      setThreads(data.threads || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <DashboardLayout
      title="Admin Comments"
      description="Comments and messages from admins on your plans. Reply right here."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {threads.map((thread) => (
          <section
            key={thread.key}
            className={`app-panel rounded-2xl border bg-white p-5 ${
              thread.needs_reply ? "border-amber-200" : "border-slate-100"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {thread.daily_task_id
                    ? `Planned task: ${thread.task_description}`
                    : `Your plan for ${formatDay(thread.plan_date)}`}
                </p>
                {thread.daily_task_id ? (
                  <p className="mt-0.5 text-xs text-slate-500">{formatDay(thread.plan_date)}</p>
                ) : null}
              </div>
              {thread.needs_reply ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Waiting for your reply
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Replied
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {thread.messages.map((entry) => {
                const mine = entry.author_id === user?.id;
                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl border px-3 py-2 ${
                      mine
                        ? "ml-6 border-emerald-100 bg-emerald-50"
                        : "border-blue-100 bg-blue-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {mine ? "You" : entry.author_name}
                      <span className="ml-2 font-normal text-slate-500">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {entry.message}
                    </p>
                  </div>
                );
              })}
            </div>

            <ReplyBox
              token={token}
              taskId={thread.daily_task_id}
              planDate={thread.plan_date}
              onSent={load}
            />
          </section>
        ))}

        {!threads.length && !isLoading ? (
          <div className="app-panel rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            No admin comments yet. When an admin writes on your plan, it will show here.
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
