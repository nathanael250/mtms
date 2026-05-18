import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

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

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const endpoint =
          user?.role === "admin"
            ? "/task-reports"
            : `/task-reports?user_id=${user.id}`;
        const data = await apiFetch(endpoint, { token });
        setReports(data.reports || []);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadReports();
  }, [token, user]);

  return (
    <DashboardLayout
      title={user?.role === "admin" ? "Reports Overview" : "My Reports"}
      description={
        user?.role === "admin"
          ? "View daily reports submitted across all jobs and tasks."
          : "Review the daily reports you submitted from your assigned tasks."
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4">Task</th>
                  <th className="min-w-[280px] px-5 py-4">Activity Done</th>
                  <th className="whitespace-nowrap px-5 py-4">Date</th>
                  <th className="whitespace-nowrap px-5 py-4">Location</th>
                  <th className="whitespace-nowrap px-5 py-4">Staff Member</th>
                  <th className="min-w-[260px] px-5 py-4">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reports.map((report) => (
                  <tr key={report.id} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                      {report.task_title}
                    </td>
                    <td className="px-5 py-4 leading-6 text-slate-600">
                      {report.activity_done}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(report.report_date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {report.location || "No location"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {report.user_name}
                    </td>
                    <td className="px-5 py-4 leading-6 text-slate-600">
                      {report.comment || "No comment"}
                    </td>
                  </tr>
                ))}
                {!reports.length ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-8 text-center text-sm text-slate-500"
                    >
                      No reports found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
