import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { http } from "../lib/api";
import { Sparkle, ArrowsClockwise, Lightning, CheckSquare, Warning,
         CaretDown, CaretUp } from "@phosphor-icons/react";

const SEV_COLOR = {
  critical: "#FF3B30",
  warning: "#FF9F0A",
  info: "#0A84FF",
};
const IMPACT_COLOR = {
  high: "#FF3B30",
  medium: "#FF9F0A",
  low: "#30D158",
};
const PRIORITY_COLOR = {
  P1: "#FF3B30",
  P2: "#FF9F0A",
  P3: "#737373",
};

const DRILL_PATH = {
  exception: (id) => `/app/evidence/${id}`,
  case: (id) => `/app/cases/${id}`,
  control: (code) => `/app/drill/control/${code}`,
  invoice: (id) => `/app/drill/invoice/${id}`,
  vendor: (id) => `/app/drill/vendor/${id}`,
  customer: (id) => `/app/drill/customer/${id}`,
  payment: (id) => `/app/drill/payment/${id}`,
  journal: (id) => `/app/drill/journal/${id}`,
  user: (id) => `/app/drill/user/${id}`,
  fixed_asset: (id) => `/app/drill/fixed_asset/${id}`,
  capex_project: (id) => `/app/drill/capex_project/${id}`,
  payroll_entry: (id) => `/app/drill/payroll_entry/${id}`,
};

export default function InsightPanel({ section, title = "AI Insights" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setErr(null);
    try {
      const r = await http.get(`/insights/${section}${refresh ? "?refresh=true" : ""}`);
      setData(r.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(false); }, [load]);

  const isLLM = data?.source && data.source.includes("gemini");
  const ageMin = data?.cache_age_sec ? Math.floor(data.cache_age_sec / 60) : 0;

  return (
    <section
      data-testid={`insight-panel-${section}`}
      className="mb-6 wow-ring wow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 border border-[#262626] bg-[#0A0A0A]/70 backdrop-blur flex items-center justify-center rounded-xl">
            <Sparkle size={14} weight="fill" className="text-[#0A84FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-base text-white tracking-tight">{title}</h3>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
              {data?.section_label || section} ·{" "}
              {isLLM ? (
                <span className="text-[#0A84FF]">gemini · flash</span>
              ) : data?.source === "heuristic" ? (
                <span className="text-[#FF9F0A]">heuristic · llm paused</span>
              ) : (
                <span>loading…</span>
              )}
              {data?.cached && <span className="text-[#525252]"> · cached {ageMin}m</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            data-testid={`insight-refresh-${section}`}
            onClick={() => load(true)}
            disabled={loading}
            title="Regenerate insights"
            className="flex items-center gap-1.5 px-3 h-8 border border-[#262626] hover:bg-[#1F1F1F]/70 transition-colors font-mono text-[10px] uppercase tracking-wider text-[#A3A3A3] hover:text-white disabled:opacity-40 wow-badge"
          >
            <ArrowsClockwise size={12} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "thinking…" : "refresh"}</span>
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            className="w-8 h-8 border border-[#262626] hover:bg-[#1F1F1F]/70 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors wow-badge"
            data-testid={`insight-collapse-${section}`}
          >
            {collapsed ? <CaretDown size={12} /> : <CaretUp size={12} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Insights */}
          <Column icon={<Lightning size={12} weight="fill" className="text-[#FF9F0A]" />} title="Insights" count={data?.insights?.length || 0}>
            {err && <EmptyState text={err} />}
            {!err && loading && !data && <Skeleton n={3} />}
            {data?.insights?.map((ins, i) => (
              <InsightCard key={i} item={ins} />
            ))}
            {!err && data && (data.insights || []).length === 0 && <EmptyState text="No insights yet." />}
          </Column>

          {/* Recommendations */}
          <Column icon={<Sparkle size={12} weight="fill" className="text-[#0A84FF]" />} title="Recommendations" count={data?.recommendations?.length || 0}>
            {!err && loading && !data && <Skeleton n={3} />}
            {data?.recommendations?.map((r, i) => (
              <RecCard key={i} item={r} />
            ))}
            {!err && data && (data.recommendations || []).length === 0 && <EmptyState text="No recommendations." />}
          </Column>

          {/* Action items */}
          <Column icon={<CheckSquare size={12} weight="fill" className="text-[#30D158]" />} title="Action Items" count={data?.action_items?.length || 0}>
            {!err && loading && !data && <Skeleton n={3} />}
            {data?.action_items?.map((a, i) => (
              <ActionCard key={i} item={a} />
            ))}
            {!err && data && (data.action_items || []).length === 0 && <EmptyState text="No actions required." />}
          </Column>
        </div>
      )}
    </section>
  );
}

function Column({ icon, title, count, children }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#A3A3A3]">{title}</h4>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#525252]">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InsightCard({ item }) {
  const color = SEV_COLOR[item.severity] || SEV_COLOR.info;
  return (
    <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 rounded-xl" style={{ borderLeft: `2px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-white leading-snug">{item.title}</div>
        {item.metric && (
          <div className="font-mono tabular-nums text-xs text-white whitespace-nowrap">{item.metric}</div>
        )}
      </div>
      {item.detail && (
        <div className="font-mono text-[11px] text-[#A3A3A3] mt-1.5 leading-relaxed">{item.detail}</div>
      )}
      {item.severity && (
        <div className="font-mono text-[9px] uppercase tracking-wider mt-2" style={{ color }}>
          {item.severity}
        </div>
      )}
    </div>
  );
}

function RecCard({ item }) {
  const color = IMPACT_COLOR[item.impact] || IMPACT_COLOR.medium;
  return (
    <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 rounded-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-white leading-snug">{item.title}</div>
        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border" style={{ color, borderColor: color }}>
          {item.impact || "med"}
        </span>
      </div>
      {item.detail && (
        <div className="font-mono text-[11px] text-[#A3A3A3] mt-1.5 leading-relaxed">{item.detail}</div>
      )}
    </div>
  );
}

function ActionCard({ item }) {
  const color = PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.P3;
  const path = item.related_type && item.related_id && DRILL_PATH[item.related_type]
    ? DRILL_PATH[item.related_type](item.related_id)
    : null;
  const Body = (
    <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 hover:bg-[#1F1F1F]/55 transition-colors rounded-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm text-white leading-snug">{item.title}</div>
        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border whitespace-nowrap" style={{ color, borderColor: color }}>
          {item.priority || "P3"}
        </span>
      </div>
      <div className="font-mono text-[10px] text-[#737373] mt-1.5 truncate">
        {item.owner_hint ? `→ ${item.owner_hint}` : "owner tba"}
        {item.related_id && <span className="ml-2 text-[#0A84FF]">{item.related_type}:{String(item.related_id).slice(0, 14)}</span>}
      </div>
    </div>
  );
  return path ? <Link to={path}>{Body}</Link> : Body;
}

function EmptyState({ text }) {
  return (
    <div className="border border-dashed border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-4 text-center rounded-xl">
      <Warning size={14} className="text-[#525252] mx-auto" />
      <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mt-1.5">{text}</div>
    </div>
  );
}

function Skeleton({ n = 3 }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 animate-pulse rounded-xl">
          <div className="h-3 w-3/4 bg-[#1F1F1F] mb-2" />
          <div className="h-2 w-full bg-[#1F1F1F] mb-1" />
          <div className="h-2 w-2/3 bg-[#1F1F1F]" />
        </div>
      ))}
    </>
  );
}
