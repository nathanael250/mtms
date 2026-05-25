import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  ListTodo,
  MessageSquareMore,
  ContactRound,
  LogOut,
  Bell,
  ClipboardList,
  UserCog,
  FileText,
  ScrollText,
  Settings,
  AlignJustify,
  ChevronDown,
  GitBranch,
  X,
} from "lucide-react";
import mopasLogo from "../assets/mopas_logo.png";
import { useAuth } from "../context/AuthContext";

const navigationByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workflow", label: "Workflow", icon: GitBranch },
    { to: "/jobs", label: "Jobs / Projects", icon: BriefcaseBusiness },
    { to: "/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/reports", label: "Reports Overview", icon: FileText },
    { to: "/mentions", label: "Mentions Overview", icon: MessageSquareMore },
    { to: "/doc-library", label: "Doc Library", icon: FileText },
    { to: "/contacts", label: "Contacts", icon: ContactRound },
    { to: "/users", label: "Users", icon: UserCog },
    { to: "/activity-logs", label: "Activity Logs", icon: ScrollText },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  staff: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workflow", label: "Workflow", icon: GitBranch },
    { to: "/tasks", label: "My Tasks", icon: ListTodo },
    { to: "/reports", label: "My Reports", icon: FileText },
    { to: "/mentions", label: "My Mentions", icon: MessageSquareMore },
    { to: "/doc-library", label: "Doc Library", icon: FileText },
    { to: "/contacts", label: "Contacts", icon: ContactRound },
  ],
};

export default function DashboardLayout({ title, description, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navigationItems = navigationByRole[user?.role] || navigationByRole.staff;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const userInitials =
    user?.full_name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "US";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function toggleNavigation() {
    setIsMobileSidebarOpen((current) => !current);
    setIsSidebarCollapsed((current) => !current);
  }

  function SidebarContent({ collapsed = false, onNavigate }) {
    return (
      <>
        <div
          className={`flex items-center gap-3 border-b border-white/10 px-[18px] py-[18px] ${
            collapsed ? "justify-center px-3" : ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white/5">
            <img
              src={mopasLogo}
              alt="Mopas logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-slate-100">
                MOPAS
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                Task management system
              </p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-[10px] py-[14px]">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `mb-1 flex items-center rounded-[10px] px-3 py-[10px] text-[13px] transition ${
                    collapsed ? "justify-center gap-0" : "gap-[10px]"
                  } ${
                    isActive
                      ? "bg-[var(--brand-600)] font-semibold text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`
                }
              >
                <Icon className="h-[15px] w-[15px] shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-[10px]">
          {!collapsed ? (
            <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Account
            </p>
          ) : null}
          <div
            className={`rounded-[12px] bg-white/5 px-3 py-3 ${
              collapsed ? "flex flex-col items-center" : ""
            }`}
          >
            {collapsed ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--shell-accent)] text-[11px] font-bold text-white">
                {userInitials}
              </div>
            ) : (
              <>
                <p className="truncate text-[13px] font-semibold text-slate-100">
                  {user?.full_name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {user?.role}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={handleLogout}
              title={collapsed ? "Logout" : undefined}
              className={`mt-3 inline-flex items-center gap-2 rounded-[10px] bg-white/10 px-3 py-2 text-[12px] font-medium text-slate-100 transition hover:bg-white/15 ${
                collapsed ? "justify-center px-2" : ""
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed ? "Logout" : null}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--page-bg)] text-slate-900">
      <aside
        className={`hidden h-screen shrink-0 flex-col bg-[var(--shell-sidebar)] text-white transition-[width] duration-200 lg:flex ${
          isSidebarCollapsed ? "w-[76px]" : "w-[210px]"
        }`}
      >
        <SidebarContent collapsed={isSidebarCollapsed} />
      </aside>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />
          <aside className="relative z-10 flex h-full w-[280px] max-w-[86vw] flex-col bg-[var(--shell-sidebar)] text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute right-3 top-3 rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setIsMobileSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-5 md:px-7">
          <button
            type="button"
            onClick={toggleNavigation}
            className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Toggle navigation"
          >
            <AlignJustify className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-slate-900">
              {title}
            </h1>
            {description ? (
              <p className="hidden truncate text-[11px] text-slate-500 xl:block">
                {description}
              </p>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell className="h-[19px] w-[19px]" />
              </button>
              <span className="absolute -right-0.5 -top-0.5 flex h-[17px] w-[17px] items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                5
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--shell-accent)] text-[12px] font-bold text-white">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <p className="text-[12.5px] font-semibold text-slate-900">
                  {user?.full_name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {user?.role === "admin" ? "Administrator" : "Staff Member"}
                </p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-[22px] sm:py-[22px]">
          {children}
        </main>
      </div>
    </div>
  );
}
