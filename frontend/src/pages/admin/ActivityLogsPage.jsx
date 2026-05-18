import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

export default function ActivityLogsPage() {
  const { token } = useAuth();
  const [activityLogs, setActivityLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadActivityLogs() {
      try {
        const data = await apiFetch("/activity-logs", { token });
        setActivityLogs(data.activityLogs || []);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadActivityLogs();
  }, [token]);

  return (
    <DashboardLayout
      title="Activity Logs"
      description="Track important job, task, report, mention, and completion actions."
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">{log.action}</p>
              <p className="mt-2 text-sm text-slate-600">{log.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {log.user_name} • {log.created_at}
              </p>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
