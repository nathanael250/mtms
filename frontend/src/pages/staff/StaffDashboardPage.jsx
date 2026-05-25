import DashboardLayout from "../../components/DashboardLayout";

export default function StaffDashboardPage({ data, error }) {
  const stats = data?.stats || {};
  const items = [
    ["My Tasks", stats.my_tasks],
    ["My Ongoing Tasks", stats.my_ongoing_tasks],
    ["My Completed Tasks", stats.my_completed_tasks],
    ["My Mentions", stats.mentions_assigned_to_me],
    ["Mentions I Created", stats.mentions_i_created],
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6"
          >
            <p className="text-[12px] font-semibold leading-tight text-slate-500 sm:text-sm">
              {label}
            </p>
            <p className="mt-3 text-[30px] font-bold leading-none tracking-tight text-slate-900 sm:mt-4 sm:text-3xl">
              {value ?? 0}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Tasks</h2>
        <div className="mt-4 space-y-3">
          {(data?.recentTasks || []).map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.job_title}</p>
            </div>
          ))}
          {!data?.recentTasks?.length ? (
            <p className="text-sm text-slate-500">No recent tasks yet.</p>
          ) : null}
        </div>
      </section>
    </DashboardLayout>
  );
}
