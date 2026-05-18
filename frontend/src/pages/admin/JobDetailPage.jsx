import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  File,
  FileText,
  Hash,
  LoaderCircle,
  RefreshCw,
  Upload,
  User,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, API_BASE_URL } from "../../lib/api";

/* ─── TOKENS ──────────────────────────────────────────────────────────── */
const BRAND   = "#2563eb";
const BRAND_L = "#eff6ff";
const GREEN   = "#16a34a";
const GREEN_L = "#f0fdf4";
const AMBER   = "#d97706";
const AMBER_L = "#fffbeb";
const RED     = "#dc2626";
const RED_L   = "#fff1f2";
const PURPLE  = "#7c3aed";
const PURPLE_L= "#f5f3ff";

const avatarPalette = [
  "#2563eb","#7c3aed","#d97706","#16a34a","#dc2626","#0891b2",
];

/* ─── UTILITIES ───────────────────────────────────────────────────────── */
function formatDate(value, withTime = false) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function getInitials(name) {
  if (!name) return "NA";
  return name.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
}

function getAvatarColor(name) {
  const seed = name ? name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) : 0;
  return avatarPalette[seed % avatarPalette.length];
}

function getTaskProgress(task) {
  if (task.status === "completed") return 100;
  if (task.status === "ongoing")   return 60;
  return 0;
}

function getActivityMeta(action) {
  const map = {
    job_created:              { icon: FileText,     color: BRAND  },
    job_updated:              { icon: Edit,         color: BRAND  },
    task_assigned:            { icon: User,         color: AMBER  },
    task_created:             { icon: CheckSquare,  color: BRAND  },
    task_completed:           { icon: CheckCircle2, color: GREEN  },
    task_started:             { icon: RefreshCw,    color: PURPLE },
    report_added:             { icon: FileText,     color: BRAND  },
    report_updated:           { icon: FileText,     color: BRAND  },
    request_created:          { icon: Upload,       color: PURPLE },
    request_resolved:         { icon: CheckCircle2, color: GREEN  },
    job_marked_completed:     { icon: CheckCircle2, color: AMBER  },
    job_approved:             { icon: CheckCircle2, color: GREEN  },
    job_rejected:             { icon: AlertCircle,  color: RED    },
  };
  return map[action] || { icon: FileText, color: BRAND };
}

function getUploadUrl(path) {
  if (!path) return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_BASE_URL.replace(/\/api$/, "");
  return `${base}/${path.startsWith("/") ? path.slice(1) : path}`;
}

function isImageFile(path = "") {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
}

function barColor(status) {
  if (status === "completed") return GREEN;
  if (status === "ongoing")   return BRAND;
  return "#cbd5e1";
}

/* ─── SMALL COMPONENTS ────────────────────────────────────────────────── */
function Avatar({ name, size = 28 }) {
  const bg = getAvatarColor(name);
  const px = size <= 24 ? "text-[9px]" : "text-[11px]";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${px}`}
      style={{ width: size, height: size, background: bg }}
    >
      {getInitials(name)}
    </div>
  );
}

function Bar({ pct, color, h = 6 }) {
  return (
    <div className="overflow-hidden rounded-full bg-slate-100" style={{ height: h, minWidth: 80 }}>
      <div
        className="rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, height: "100%", background: color }}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const n = (status || "").toUpperCase();
  const map = {
    COMPLETED:                  { bg: GREEN_L,  color: GREEN,  border: "#bbf7d0" },
    ONGOING:                    { bg: BRAND_L,  color: BRAND,  border: "#bfdbfe" },
    ASSIGNED:                   { bg: RED_L,    color: RED,    border: "#fecaca" },
    PENDING:                    { bg: AMBER_L,  color: AMBER,  border: "#fde68a" },
    COMPLETED_PENDING_APPROVAL: { bg: PURPLE_L, color: PURPLE, border: "#ddd6fe" },
    REJECTED:                   { bg: RED_L,    color: RED,    border: "#fecaca" },
    CANCELLED:                  { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
  };
  const st = map[n] || map.PENDING;
  return (
    <span
      className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
      style={{ background: st.bg, color: st.color, border: `1.5px solid ${st.border}` }}
    >
      {n.replaceAll("_", " ")}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === "completed") return <CheckCircle2 size={15} color={GREEN} />;
  if (status === "ongoing")   return <RefreshCw    size={15} color={BRAND} className="animate-spin" style={{ animationDuration: "3s" }} />;
  return <AlertCircle size={15} color={RED} />;
}

/* Reusable section card */
function SCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* Section header row */
function SHeader({ title, action, actionLabel = "View All" }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[13px] font-bold tracking-tight text-slate-800">{title}</h3>
      {action && (
        <button
          onClick={action}
          className="text-[11.5px] font-semibold text-blue-600 transition hover:text-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Circular progress ring */
function Ring({ pct, size = 88, stroke = 7 }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash  = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={BRAND} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────────────────── */
export default function JobDetailPage() {
  const { id }    = useParams();
  const { token } = useAuth();
  const [showAll,  setShowAll]  = useState(false);
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [progressData, detailData] = await Promise.all([
          apiFetch(`/jobs/${id}/progress`, { token }),
          apiFetch(`/jobs/${id}`,          { token }),
        ]);
        setPageData({ ...progressData, contacts: detailData.contacts || [], attachments: detailData.attachments || [] });
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, token]);

  const d = useMemo(() => {
    const job          = pageData?.job         || null;
    const tasks        = pageData?.tasks        || [];
    const reports      = pageData?.reports      || [];
    const activityLogs = pageData?.activityLogs || [];
    const contacts     = pageData?.contacts     || [];
    const attachments  = pageData?.attachments  || [];

    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const ongoingTasks   = tasks.filter(t => t.status === "ongoing").length;
    const pendingTasks   = tasks.filter(t => ["assigned","pending"].includes(t.status)).length;
    const progress       = totalTasks
      ? Math.round(((completedTasks + ongoingTasks * 0.6) / totalTasks) * 100)
      : 0;

    const clientName = contacts[0]?.full_name || contacts[0]?.company_name || "Not assigned";

    const documents = [
      ...(job?.approval_document ? [{
        id: `approval-${job.id}`, name: "Approval Document",
        file_path: job.approval_document, uploaded: job.created_at, by: job.created_by_name,
      }] : []),
      ...attachments.map(a => ({
        id: a.id, name: a.file_name, file_path: a.file_path,
        uploaded: a.created_at, by: a.uploaded_by_name,
      })),
    ];

    const previewImage =
      documents.find((doc) => isImageFile(doc.file_path))?.file_path || null;

    const today = new Date();
    const dow   = today.getDay();
    const mon   = new Date(today);
    mon.setDate(today.getDate() + (dow === 0 ? -6 : 1 - dow));
    mon.setHours(0,0,0,0);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(mon);
      date.setDate(mon.getDate() + i);
      const iso   = date.toISOString().slice(0, 10);
      const count = reports.filter(r => r.report_date?.slice(0, 10) === iso).length;
      return {
        day:   date.toLocaleDateString("en-GB", { weekday: "short" }),
        date:  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        count,
      };
    });

    return { job, tasks, reports, activityLogs, documents, weekDays, clientName, previewImage,
             totalTasks, completedTasks, ongoingTasks, pendingTasks, progress };
  }, [pageData]);

  const shown = showAll ? d.tasks : d.tasks.slice(0, 6);

  /* ── states ── */
  if (isLoading) return (
    <DashboardLayout title="Project / Job Progress" description="Monitor progress, tasks and activity.">
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400">Loading project…</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout title="Project / Job Progress" description="Monitor progress, tasks and activity.">
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        <AlertCircle size={16} /> {error}
      </div>
    </DashboardLayout>
  );

  if (!d.job) return (
    <DashboardLayout title="Project / Job Progress" description="Monitor progress, tasks and activity.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Project not found.
      </div>
    </DashboardLayout>
  );

  /* ── render ── */
  return (
    <DashboardLayout title="Project / Job Progress" description="Monitor progress, tasks and activity.">
      <div className="flex flex-col gap-5">

        {/* ── TOP ACTION BAR ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={14} />
            Back to Projects
          </Link>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98]">
              <Edit size={13} /> Edit Job
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              Mark Ready for Completion
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              More <ChevronDown size={13} />
            </button>
          </div>
        </div>

        {/* ── MAIN GRID ──────────────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

          {/* LEFT */}
          <div className="flex min-w-0 flex-col gap-5">

            {/* ── PROJECT HERO CARD ──────────────────────────────────── */}
            <SCard className="overflow-hidden">
              <div className="p-6">
                <div className="flex flex-wrap gap-6 xl:flex-nowrap">

                  {/* Thumbnail */}
                  <div className="relative flex h-[148px] w-[220px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1d3d6b] to-[#2d6cb4] shadow-md">
                    {d.previewImage ? (
                      <img
                        src={getUploadUrl(d.previewImage)}
                        alt={`${d.job.title} preview`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 30% 30%, #60a5fa, transparent 60%)",
                          }}
                        />
                        <BriefcaseBusiness
                          size={42}
                          className="relative text-white/90 drop-shadow"
                        />
                      </>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-start gap-3">
                      <h1 className="text-xl font-bold leading-snug tracking-tight text-slate-900">
                        {d.job.title}
                      </h1>
                      <StatusBadge status={d.job.status} />
                    </div>

                    <div className="mb-4 grid gap-x-7 gap-y-2 text-[12px] sm:grid-cols-2">
                      {[
                        [Hash,      "Job Code",   d.job.job_code],
                        [Building2, "Client",     d.clientName],
                        [Calendar,  "Start Date", formatDate(d.job.start_date)],
                        [Calendar,  "End Date",   formatDate(d.job.end_date)],
                      ].map(([Icon, lbl, val]) => (
                        <div key={lbl} className="flex items-center gap-2">
                          <Icon size={12} className="shrink-0 text-slate-300" />
                          <span className="text-slate-400">{lbl}:</span>
                          <span className="font-semibold text-[11px] leading-[1.35] text-slate-700">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="max-w-xl text-[13px] leading-relaxed text-slate-500">
                      <span className="font-semibold text-slate-600">Description: </span>
                      {d.job.description || "No description provided."}
                    </p>
                  </div>

                  {/* Right cards */}
                  <div className="flex shrink-0 flex-col gap-3 xl:w-[336px]">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Progress ring card */}
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Progress</p>
                        <div className="relative">
                          <Ring pct={d.progress} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[18px] font-extrabold tabular-nums text-blue-600">{d.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Status info card */}
                      <div className="flex flex-col justify-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Status</p>
                          <StatusBadge status={d.job.status} />
                        </div>
                        <div className="text-[12px] leading-relaxed text-slate-500">
                          <p><span className="font-semibold text-slate-600">By:</span> {d.job.created_by_name}</p>
                          <p><span className="font-semibold text-slate-600">On:</span> {formatDate(d.job.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold uppercase tracking-wide">Overall completion</span>
                        <span className="font-bold tabular-nums text-blue-600">{d.progress}%</span>
                      </div>
                      <Bar pct={d.progress} color={BRAND} h={7} />
                    </div>
                  </div>

                </div>
              </div>
            </SCard>

            {/* ── STAT CARDS ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: CheckSquare,  label: "Total Tasks",     value: d.totalTasks,     color: BRAND,  bg: BRAND_L,  accent: "#dbeafe" },
                { icon: CheckCircle2, label: "Completed",       value: d.completedTasks, color: GREEN,  bg: GREEN_L,  accent: "#bbf7d0" },
                { icon: RefreshCw,    label: "Ongoing",         value: d.ongoingTasks,   color: PURPLE, bg: PURPLE_L, accent: "#ddd6fe" },
                { icon: Clock,        label: "Pending",         value: d.pendingTasks,   color: AMBER,  bg: AMBER_L,  accent: "#fde68a" },
              ].map(item => (
                <SCard key={item.label} className="relative overflow-hidden p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: item.bg }}
                    >
                      <item.icon size={17} color={item.color} />
                    </div>
                    <span className="text-[30px] font-extrabold tabular-nums leading-none tracking-tight text-slate-900">
                      {item.value}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] font-medium text-slate-400">{item.label}</p>
                </SCard>
              ))}
            </div>

            {/* ── TASKS TABLE ─────────────────────────────────────────── */}
            <SCard className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={15} className="text-blue-500" />
                  <h3 className="text-[13px] font-bold text-slate-800">Tasks Progress</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {d.totalTasks}
                  </span>
                </div>
                <button className="text-[11.5px] font-semibold text-blue-600 transition hover:text-blue-700">
                  View All Tasks
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-slate-50">
                      {["#", "Task Title", "Assigned To", "Status", "Progress", "Due Date", ""].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.length ? shown.map((task, i) => {
                      const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                      return (
                        <tr
                          key={task.id}
                          className="group border-b border-slate-100 transition hover:bg-blue-50/40"
                        >
                          <td className="px-5 py-3.5 text-slate-300 font-medium">{i + 1}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">{task.title}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={task.assigned_to_name} size={24} />
                              <span className="text-slate-500">{task.assigned_to_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><StatusBadge status={task.status} /></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-slate-500">
                                {getTaskProgress(task)}%
                              </span>
                              <div className="flex-1">
                                <Bar pct={getTaskProgress(task)} color={barColor(task.status)} h={5} />
                              </div>
                            </div>
                          </td>
                          <td className={`px-5 py-3.5 text-[12px] font-medium ${overdue ? "text-rose-500" : "text-slate-500"}`}>
                            {formatDate(task.due_date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusIcon status={task.status} />
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                          No tasks yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {d.tasks.length > 6 && (
                <div className="flex justify-center border-t border-slate-100 py-3">
                  <button
                    onClick={() => setShowAll(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    {showAll ? <><ChevronUp size={13}/> Show Less</> : <><ChevronDown size={13}/> Show More Tasks</>}
                  </button>
                </div>
              )}
            </SCard>

            {/* ── DAILY REPORTS + DOCUMENTS ───────────────────────────── */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

              {/* Daily Reports */}
              <SCard className="p-6">
                <div className="mb-5 flex items-center gap-2">
                  <TrendingUp size={14} className="text-blue-500" />
                  <h3 className="text-[13px] font-bold text-slate-800">Daily Reports Summary</h3>
                  <span className="text-[12px] text-slate-400">(This Week)</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {d.weekDays.map(day => (
                    <div key={`${day.day}-${day.date}`} className="flex flex-col items-center gap-1">
                      <p className="text-[11px] font-semibold text-slate-500">{day.day}</p>
                      <p className="text-[9px] text-slate-400">{day.date}</p>
                      <p className={`text-[20px] font-extrabold tabular-nums leading-none ${day.count > 0 ? "text-slate-900" : "text-slate-300"}`}>
                        {day.count}
                      </p>
                      <div className="flex h-10 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                        <div
                          className="w-full rounded-lg bg-blue-500 transition-all duration-500"
                          style={{
                            height: day.count > 0 ? `${Math.min((day.count / 4) * 100, 100)}%` : "0%",
                            minHeight: day.count > 0 ? 6 : 0,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SCard>

              {/* Documents */}
              <SCard className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <SHeader title="Job Documents" />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {d.documents.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {d.documents.length ? d.documents.map(doc => (
                    <a
                      key={doc.id}
                      href={getUploadUrl(doc.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 transition group-hover:bg-rose-200">
                        <File size={15} color={RED} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-slate-800">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(doc.uploaded)} · {doc.by || "Unknown"}
                        </p>
                      </div>
                    </a>
                  )) : (
                    <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                  )}
                </div>
              </SCard>
            </div>

          </div>{/* end LEFT */}

          {/* ── RIGHT SIDEBAR ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Recent Activity */}
            <SCard className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <SHeader title="Recent Activity" />
                <button className="text-[11px] font-semibold text-blue-600 transition hover:text-blue-700">View All</button>
              </div>
              <div className="flex flex-col gap-4">
                {d.activityLogs.length ? d.activityLogs.slice(0, 4).map(item => {
                  const meta = getActivityMeta(item.action);
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${meta.color}15` }}
                      >
                        <meta.icon size={13} color={meta.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] leading-snug text-slate-700">{item.description}</p>
                        <p className="mt-1 text-[10.5px] text-slate-400">
                          {item.user_name} · {formatDate(item.created_at, true)}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                )}
              </div>
            </SCard>

            {/* Recent Reports */}
            <SCard className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <SHeader title="Recent Reports" />
                <button className="text-[11px] font-semibold text-blue-600 transition hover:text-blue-700">View All</button>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {d.reports.length ? d.reports.slice(0, 4).map(report => (
                  <div key={report.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-[10.5px] text-slate-400">{formatDate(report.report_date)}</p>
                      <p className="mt-0.5 text-[12.5px] font-semibold text-slate-800">{report.task_title}</p>
                      <p className="text-[11px] text-slate-400">by {report.user_name}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-400">No reports yet.</p>
                )}
              </div>
            </SCard>

            {/* Quick stats */}
            <SCard className="overflow-hidden p-5">
              <h3 className="mb-4 text-[13px] font-bold text-slate-800">Completion Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Completed", count: d.completedTasks, total: d.totalTasks, color: GREEN },
                  { label: "In Progress", count: d.ongoingTasks, total: d.totalTasks, color: BRAND },
                  { label: "Pending",   count: d.pendingTasks,   total: d.totalTasks, color: AMBER },
                ].map(item => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-[11.5px]">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="font-bold tabular-nums text-slate-700">
                        {item.count}/{item.total}
                      </span>
                    </div>
                    <Bar
                      pct={item.total ? Math.round((item.count / item.total) * 100) : 0}
                      color={item.color}
                      h={6}
                    />
                  </div>
                ))}
              </div>
            </SCard>

          </div>{/* end RIGHT */}
        </div>
      </div>
    </DashboardLayout>
  );
}
