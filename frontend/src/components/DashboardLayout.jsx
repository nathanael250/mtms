import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  Activity,
  X,
} from "lucide-react";
import mopasLogo from "../assets/mopas_logo.png";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const navigationByRole = {
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/workflow", label: "Workflow", icon: GitBranch },
    { to: "/daily-activities-log", label: "Daily Activities Log", icon: Activity },
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
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const navigationItems = navigationByRole[user?.role] || navigationByRole.staff;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const accountMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
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

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setIsAccountMenuOpen(false);
      }
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target)
      ) {
        setIsNotificationMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      if (!token || !user?.role) {
        setNotifications([]);
        return;
      }

      try {
        const endpoint =
          user.role === "admin"
            ? "/report-mentions"
            : "/report-mentions/assigned-to-me";
        const data = await apiFetch(endpoint, { token });
        setNotifications(data.mentions || []);
      } catch {
        setNotifications([]);
      }
    }

    loadNotifications();
  }, [token, user?.role]);

  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "unread"
  );

  function toggleNavigation() {
    setIsMobileSidebarOpen((current) => !current);
    setIsSidebarCollapsed((current) => !current);
  }

  function SidebarContent({ collapsed = false, onNavigate }) {
    return (
      <>
        <div
          className={`border-b border-white/10 px-[18px] py-[18px] ${
            collapsed ? "flex justify-center px-3" : ""
          }`}
        >
          <img
            src={mopasLogo}
            alt="MOPAS"
            className={`w-auto object-contain object-left ${collapsed ? "h-7" : "h-9"}`}
          />
          {!collapsed ? (
            <p className="mt-2 text-[11px] text-slate-400">Task management system</p>
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
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => setIsNotificationMenuOpen((current) => !current)}
                className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                aria-label="Open notifications"
                aria-haspopup="menu"
                aria-expanded={isNotificationMenuOpen}
              >
                <Bell className="h-[19px] w-[19px]" />
              </button>
              {unreadNotifications.length ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                </span>
              ) : null}

              {isNotificationMenuOpen ? (
                <div
                  role="menu"
                  className="app-panel absolute right-0 top-full z-40 mt-2 w-[320px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">
                        Notifications
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {unreadNotifications.length} unread mention
                        {unreadNotifications.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <NavLink
                      to="/mentions"
                      onClick={() => setIsNotificationMenuOpen(false)}
                      className="text-xs font-semibold text-[var(--brand-700)]"
                    >
                      View all
                    </NavLink>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {(unreadNotifications.length
                      ? unreadNotifications
                      : notifications
                    )
                      .slice(0, 5)
                      .map((notification) => (
                        <NavLink
                          key={notification.id}
                          to="/mentions"
                          onClick={() => setIsNotificationMenuOpen(false)}
                          className="block rounded-[10px] px-3 py-3 transition hover:bg-slate-50"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                notification.status === "unread"
                                  ? "bg-rose-500"
                                  : "bg-slate-300"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {notification.mentioned_by_name || "Staff"} mentioned you
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </NavLink>
                      ))}
                    {!notifications.length ? (
                      <div className="px-3 py-8 text-center text-sm text-slate-500">
                        No notifications yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                className="flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-left transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
              >
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
                <ChevronDown
                  className={`hidden h-3.5 w-3.5 text-slate-400 transition sm:block ${
                    isAccountMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isAccountMenuOpen ? (
                <div
                  role="menu"
                  className="app-panel absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-xl"
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-500)] to-[var(--shell-accent)] text-sm font-bold text-white">
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {user?.full_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user?.role === "admin" ? "Administrator" : "Staff Member"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <NavLink
                      to="/mentions"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      <MessageSquareMore className="h-4 w-4 text-slate-400" />
                      Mentions
                    </NavLink>
                    {user?.role === "admin" ? (
                      <NavLink
                        to="/settings"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        Settings
                      </NavLink>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
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
