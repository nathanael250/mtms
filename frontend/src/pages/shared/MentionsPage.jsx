import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

export default function MentionsPage() {
  const { token, user } = useAuth();
  const [mentions, setMentions] = useState([]);
  const [error, setError] = useState("");

  async function loadMentions() {
    try {
      const endpoint =
        user?.role === "admin"
          ? "/report-mentions"
          : "/report-mentions/assigned-to-me";
      const data = await apiFetch(endpoint, { token });
      setMentions(data.mentions || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadMentions();
  }, [token, user]);

  async function handleAction(id, action) {
    try {
      await apiFetch(`/report-mentions/${id}/${action}`, {
        method: "PATCH",
        token,
      });
      loadMentions();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <DashboardLayout
      title={user?.role === "admin" ? "Mentions Overview" : "My Mentions"}
      description={
        user?.role === "admin"
          ? "Monitor report tags and followups created by staff."
          : "See the tags assigned to you from daily report comments."
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {mentions.map((mention) => (
            <div
              key={mention.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {mention.mentioned_by_name || "Staff"} mentioned{" "}
                    {mention.mentioned_user_name || "staff"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{mention.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {mention.created_at}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold capitalize text-[var(--brand-700)]">
                    {mention.status}
                  </span>
                  {user?.role !== "admin" && mention.status === "unread" ? (
                    <button
                      type="button"
                      onClick={() => handleAction(mention.id, "read")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      Mark Read
                    </button>
                  ) : null}
                  {user?.role !== "admin" && mention.status !== "resolved" ? (
                    <button
                      type="button"
                      onClick={() => handleAction(mention.id, "resolve")}
                      className="rounded-xl bg-[var(--brand-700)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {!mentions.length ? (
            <p className="text-sm text-slate-500">No mentions found yet.</p>
          ) : null}
        </div>
      </section>
    </DashboardLayout>
  );
}
