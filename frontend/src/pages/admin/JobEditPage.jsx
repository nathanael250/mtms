import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import JobForm from "../../components/JobForm";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

// The full job form, filled in with an existing job so everything can be changed.
export default function JobEditPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch(`/jobs/${id}`, { token }),
      apiFetch(`/jobs/${id}/progress`, { token }),
    ])
      .then(([jobData, progress]) =>
        setData({
          job: jobData.job,
          attachments: jobData.attachments || [],
          // Oldest first, the order they were entered in.
          tasks: [...(progress.tasks || [])].sort((a, b) => a.id - b.id),
        })
      )
      .catch((loadError) => setError(loadError.message));
  }, [id, token]);

  return (
    <DashboardLayout
      title="Edit Job"
      description="Change the job details, its documents and its tasks."
    >
      <div className="space-y-5">
        <Link
          to={`/jobs/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={14} />
          Back to the job
        </Link>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {data ? (
          <section className="app-panel rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm md:rounded-[30px] md:p-6">
            <JobForm
              mode="edit"
              job={data.job}
              tasks={data.tasks}
              attachments={data.attachments}
              onCancel={() => navigate(`/jobs/${id}`)}
              onDone={() => navigate(`/jobs/${id}`)}
            />
          </section>
        ) : !error ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
