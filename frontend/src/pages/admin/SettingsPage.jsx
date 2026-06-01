import { Link } from "react-router-dom";
import { ArrowRight, Cloud, Folder } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

export default function SettingsPage() {
  const settingsModules = [
    {
      to: "/settings/document-categories",
      title: "Document Categories",
      description: "Create and manage categories used by Doc Library uploads.",
      action: "Manage categories",
      icon: Folder,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      to: "/settings/google-drive",
      title: "Google Drive Integration",
      description: "Configure the Drive folders for pending, approved, and rejected documents.",
      action: "Configure Drive",
      icon: Cloud,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <DashboardLayout
      title="Settings"
      description="Administrative system settings and business preferences."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {settingsModules.map((module) => (
          <Link
            key={module.to}
            to={module.to}
            className="group rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-[var(--brand-400)] hover:shadow-md focus-visible:border-[var(--brand-500)] focus-visible:ring-4 focus-visible:ring-blue-100"
            aria-label={`Open ${module.title}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] ${module.tone}`}>
                <module.icon className="h-6 w-6" />
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-[var(--brand-600)] group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>

            <h2 className="mt-5 text-base font-bold text-slate-950">
              {module.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {module.description}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-700)]">
              {module.action}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </p>
          </Link>
        ))}
      </section>
    </DashboardLayout>
  );
}
