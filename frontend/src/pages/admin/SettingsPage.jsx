import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";

export default function SettingsPage() {
  const settingsModules = [
    {
      to: "/settings/document-categories",
      title: "Document Categories",
      description: "Create and manage categories used by Doc Library uploads.",
    },
    {
      to: "/settings/google-drive",
      title: "Google Drive Integration",
      description: "Configure the Drive folders for pending, approved, and rejected documents.",
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
            className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand-300)] hover:shadow-md"
          >
            <h2 className="text-base font-bold text-slate-950">{module.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {module.description}
            </p>
          </Link>
        ))}
      </section>
    </DashboardLayout>
  );
}
