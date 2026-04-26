import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  ChartPieSlice, Gauge, Scales, ShieldCheck, Briefcase, ListChecks,
  Graph, ChatCircleDots, GearSix, UploadSimple, SignOut, CaretLeft, Lightning, Eye,
  Sun, Moon, TreeStructure, Gavel, Plug,
} from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import clsx from "clsx";

const FULL_NAV = [
  { to: "/app/cfo", label: "CFO Cockpit", icon: Gauge, testId: "nav-cfo" },
  { to: "/app/controller", label: "Controller", icon: ChartPieSlice, testId: "nav-controller" },
  { to: "/app/audit", label: "Audit Workspace", icon: Scales, testId: "nav-audit" },
  { to: "/app/compliance", label: "Compliance", icon: ShieldCheck, testId: "nav-compliance" },
  { to: "/app/my-cases", label: "My Cases", icon: Briefcase, testId: "nav-my-cases" },
  { to: "/app/cases", label: "All Cases", icon: ListChecks, testId: "nav-cases" },
  { to: "/app/evidence", label: "Evidence Explorer", icon: Graph, testId: "nav-evidence" },
  { to: "/app/copilot", label: "AI Copilot", icon: ChatCircleDots, testId: "nav-copilot" },
  { to: "/app/upload", label: "Ingest (CSV)", icon: UploadSimple, testId: "nav-upload" },
  { to: "/app/admin", label: "Admin & Governance", icon: GearSix, testId: "nav-admin" },
  { to: "/app/rollups", label: "Entity rollups", icon: TreeStructure, testId: "nav-rollups" },
  { to: "/app/governance", label: "Retention & holds", icon: Gavel, testId: "nav-governance" },
  { to: "/app/connectors", label: "Connectors", icon: Plug, testId: "nav-connectors" },
  { to: "/app/approvals", label: "Approvals", icon: ShieldCheck, testId: "nav-approvals" },
];

const EXTERNAL_AUDITOR_NAV = [
  { to: "/app/auditor", label: "Auditor Pack", icon: Eye, testId: "nav-auditor" },
  { to: "/app/evidence", label: "Evidence Explorer", icon: Graph, testId: "nav-evidence" },
  { to: "/app/copilot", label: "AI Copilot", icon: ChatCircleDots, testId: "nav-copilot" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const NAV = user?.role === "External Auditor" ? EXTERNAL_AUDITOR_NAV : FULL_NAV;

  const doLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex wow-bg" data-testid="app-layout">
      <aside
        className={clsx(
          "flex flex-col border-r border-[#262626] bg-[#0A0A0A]/70 backdrop-blur-xl transition-all duration-150",
          collapsed ? "w-16" : "w-64"
        )}
        data-testid="sidebar"
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white flex items-center justify-center shadow-[0_8px_22px_rgba(255,255,255,0.10)]">
              <Lightning size={14} weight="fill" color="#000" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none">
                <span className="font-heading text-sm tracking-tight text-white">OneTouch</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#737373]">audit · ai</span>
              </div>
            )}
          </div>
          <button
            data-testid="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            className="text-[#737373] hover:text-white transition-colors"
          >
            <CaretLeft size={14} weight="regular" className={clsx(collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {!collapsed && (
            <div className="px-4 pb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#525252]">Navigation</div>
          )}
          {NAV.map(({ to, label, icon: Icon, testId }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testId}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 border-l-2",
                  isActive
                    ? "bg-[#141414]/80 text-white border-white shadow-[0_10px_24px_rgba(0,0,0,0.20)]"
                    : "border-transparent text-[#A3A3A3] hover:text-white hover:bg-[#141414]/70"
                )
              }
            >
              <Icon size={16} weight="regular" />
              {!collapsed && (
                <span className="flex-1">{label}</span>
              )}
              {!collapsed && (
                <span
                  className={clsx(
                    "opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] uppercase tracking-[0.18em] text-[#525252]"
                  )}
                >
                  →
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-[#262626]">
          {!collapsed && user && (
            <div className="mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">Signed in</div>
              <div className="text-sm text-white truncate" data-testid="user-name">{user.full_name}</div>
              <div className="font-mono text-[10px] text-[#737373] truncate">{user.role}</div>
            </div>
          )}
          <button
            data-testid="logout-btn"
            onClick={doLogout}
            className="w-full flex items-center gap-2 text-xs text-[#A3A3A3] hover:text-[#FF3B30] transition-colors"
          >
            <SignOut size={14} /> {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto" data-testid="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [now, setNow] = useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <header
      className="h-12 border-b border-[#262626] flex items-center px-6 justify-between bg-[#0A0A0A]/60 backdrop-blur-xl"
      data-testid="topbar"
    >
      <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373]">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#30D158] pulse-dot" /> system · live
        </span>
        <span>{now.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          data-testid="theme-toggle-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
          className="flex items-center gap-2 px-3 h-8 border border-[#262626] hover:bg-[#141414]/70 transition-colors font-mono text-[10px] uppercase tracking-wider text-[#A3A3A3] hover:text-white wow-badge"
        >
          {theme === "dark" ? <Sun size={13} weight="regular" /> : <Moon size={13} weight="regular" />}
          <span>{theme === "dark" ? "light" : "dark"}</span>
        </button>
        {user && (
          <div className="flex items-center gap-2 px-3 py-1 border border-[#262626] wow-badge">
            <div className="w-6 h-6 bg-white text-black font-mono text-xs flex items-center justify-center">
              {user.full_name?.[0] || "?"}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#A3A3A3]">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
}
