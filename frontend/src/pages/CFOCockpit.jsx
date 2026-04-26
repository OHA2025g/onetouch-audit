import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { SeverityBadge } from "../components/Badges";
import { fmtUSD, fmtPct, fmtDate } from "../lib/format";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import { ArrowRight, Download, ArrowsClockwise, Sparkle, FunnelSimple, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import clsx from "clsx";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

const PROCESSES = ["Procure-to-Pay", "Record-to-Report", "Treasury", "Access/SoD", "Tax"];

export default function CFOCockpit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [processFilter, setProcessFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/dashboard/cfo");
      setData(data);
    } catch (e) { toast.error("Failed to load CFO data"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAll = async () => {
    setRefreshing(true);
    try {
      const { data: r } = await http.post("/controls/run-all");
      toast.success(`Re-ran ${r.runs.length} controls · ${r.total_exceptions} exceptions`);
      await load();
    } catch (e) { toast.error("Run failed"); }
    setRefreshing(false);
  };

  const exportPack = async (format) => {
    try {
      const resp = await http.get(`/reports/audit-committee-pack.${format}`, { responseType: "blob" });
      const blob = new Blob([resp.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `audit-committee-pack.${format}`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()} pack`);
    } catch { toast.error(`Export ${format} failed`); }
  };

  if (loading || !data) {
    return <div className="p-8 font-mono text-xs text-[#737373] uppercase tracking-wider" data-testid="cfo-loading">Loading command center…</div>;
  }

  const k = data.kpis;
  const entities = [...new Set((data.heatmap || []).map(r => r.entity))].sort();
  const processes = [...new Set((data.heatmap || []).map(r => r.process))].sort();
  const filteredHeatmap = (data.heatmap || []).filter(r =>
    (processFilter === "all" || r.process === processFilter) &&
    (entityFilter === "all" || r.entity === entityFilter)
  );
  const filteredTopRisks = (data.top_risks || []).filter(r =>
    (processFilter === "all" || r.process === processFilter) &&
    (entityFilter === "all" || r.entity === entityFilter)
  ).slice(0, 10);

  return (
    <PageShell maxWidth="max-w-[1600px]" className="" >
      <div data-testid="cfo-cockpit">
        <PageHeader
          kicker="CFO · COMMAND CENTER"
          title="Audit readiness"
          subtitle={
            <>
              Enterprise view · {fmtDate(new Date().toISOString())} ·{" "}
              {entityFilter === "all" ? "all entities" : entityFilter}
              {processFilter !== "all" ? ` · ${processFilter}` : ""}
            </>
          }
          right={
            <>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F]/70 transition-colors rounded-full wow-badge"
                data-testid="mobile-filters-btn"
              >
                <FunnelSimple size={12} /> Filters
              </button>
              <button
                data-testid="run-all-btn"
                onClick={runAll}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F]/70 transition-colors disabled:opacity-50 rounded-full wow-badge"
              >
                <ArrowsClockwise size={12} className={clsx(refreshing && "animate-spin")} /> Run all controls
              </button>
              <button
                data-testid="export-xlsx-btn"
                onClick={() => exportPack("xlsx")}
                className="flex items-center gap-2 px-3 py-2 bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F]/70 transition-colors rounded-full wow-badge"
              >
                <Download size={12} /> XLSX
              </button>
              <button
                data-testid="export-pack-btn"
                onClick={() => exportPack("pdf")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-mono uppercase tracking-wider hover:bg-[#E5E5E5] transition-colors rounded-full shadow-[0_22px_70px_rgba(255,255,255,0.10)]"
              >
                <Download size={12} /> Export PDF
              </button>
            </>
          }
        />

        {/* Desktop filters */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <span className="wow-badge px-3 h-9 inline-flex items-center font-mono text-[10px] uppercase tracking-wider text-[#A3A3A3]">
            Filters
          </span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono text-white px-3 h-9 rounded-full outline-none focus:border-white"
            data-testid="entity-filter"
          >
          <option value="all">All entities</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            value={processFilter}
            onChange={(e) => setProcessFilter(e.target.value)}
            className="bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono text-white px-3 h-9 rounded-full outline-none focus:border-white"
            data-testid="process-filter"
          >
          <option value="all">All processes</option>
          {processes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(entityFilter !== "all" || processFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setEntityFilter("all"); setProcessFilter("all"); }}
              className="text-xs font-mono uppercase px-4 h-9 border border-[#262626] text-[#A3A3A3] hover:text-white rounded-full wow-badge"
            >
              Clear
            </button>
          )}
        </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] max-w-sm bg-[#0A0A0A] border-l border-[#262626] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Filters</div>
              <button onClick={() => setFiltersOpen(false)} className="text-[#A3A3A3] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-mono text-[10px] uppercase text-[#737373] mb-1">Entity</div>
                <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="w-full bg-[#141414] border border-[#404040] text-xs font-mono text-white px-2 py-2">
                  <option value="all">All entities</option>
                  {entities.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-[#737373] mb-1">Process</div>
                <select value={processFilter} onChange={(e) => setProcessFilter(e.target.value)} className="w-full bg-[#141414] border border-[#404040] text-xs font-mono text-white px-2 py-2">
                  <option value="all">All processes</option>
                  {processes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 bg-white text-black text-xs font-mono uppercase py-2"
                  onClick={() => setFiltersOpen(false)}
                >
                  Apply
                </button>
                <button
                  className="flex-1 border border-[#404040] text-white text-xs font-mono uppercase py-2"
                  onClick={() => { setEntityFilter("all"); setProcessFilter("all"); }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* KPI hero band */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div onClick={() => nav("/app/cases?status=open")} className="cursor-pointer" data-testid="kpi-readiness-link">
          <StatCard label="Audit readiness" value={k.audit_readiness_pct.toFixed(1)} unit="%"
                    severity={k.audit_readiness_pct >= 80 ? "success" : k.audit_readiness_pct >= 60 ? "warning" : "critical"}
                    testId="kpi-readiness" trend={+2.4} />
        </div>
        <div onClick={() => nav("/app/cases?severity=critical")} className="cursor-pointer" data-testid="kpi-exposure-link">
          <StatCard label="Unresolved exposure" value={fmtUSD(k.unresolved_high_risk_exposure)} unit=""
                    severity="critical" testId="kpi-exposure" trend={-1.2} />
        </div>
        <div onClick={() => nav("/app/cases?severity=high")} className="cursor-pointer" data-testid="kpi-highcrit-link">
          <StatCard label="High/critical cases" value={k.high_critical_open_cases} unit="open"
                    severity={k.high_critical_open_cases > 5 ? "critical" : "warning"} testId="kpi-highcrit" />
        </div>
        <div onClick={() => nav("/app/audit")} className="cursor-pointer" data-testid="kpi-repeat-link">
          <StatCard label="Repeat findings" value={fmtPct(k.repeat_finding_rate_pct)} unit=""
                    severity={k.repeat_finding_rate_pct > 30 ? "warning" : "success"} testId="kpi-repeat" />
        </div>
        <div onClick={() => nav("/app/cases")} className="cursor-pointer" data-testid="kpi-evidence-link">
          <StatCard label="Evidence completeness" value={fmtPct(k.evidence_completeness_pct)} unit=""
                    testId="kpi-evidence" />
        </div>
        <div onClick={() => nav("/app/cases?status=open")} className="cursor-pointer" data-testid="kpi-sla-link">
          <StatCard label="Remediation SLA" value={fmtPct(k.remediation_sla_pct)} unit=""
                    severity={k.remediation_sla_pct >= 85 ? "success" : "warning"} testId="kpi-sla" />
        </div>
      </div>

        <InsightPanel section="cfo" title="CFO AI Insights" />

        {/* Two-column: Heatmap + AI narrative */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <SectionCard
            className="lg:col-span-2"
            kicker="READINESS"
            title="Process × entity heatmap"
            right={<span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">lower = worse</span>}
          >
            <Heatmap rows={filteredHeatmap.length ? filteredHeatmap : data.heatmap} />
          </SectionCard>

          <SectionCard className="beam-border" kicker="ASSURANCE AI" title="AI narrative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle size={14} weight="fill" className="text-[#0A84FF]" />
            <h3 className="font-heading text-base text-white tracking-tight">AI narrative</h3>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-[#0A84FF] border border-[#0A84FF]/40 px-1.5 py-0.5">gemini · flash</span>
          </div>
          <div className="space-y-3 text-sm text-[#E5E5E5] leading-relaxed">
            <p>
              Overall readiness at <span className="font-mono tabular-nums text-white">{k.audit_readiness_pct.toFixed(1)}%</span> with <span className="text-[#FF3B30] font-mono">{fmtUSD(k.unresolved_high_risk_exposure)}</span> in unresolved exposure across {k.high_critical_open_cases} high/critical open cases<span className="font-mono text-[#737373]"> [#1]</span>.
            </p>
            <p>
              Top risk drivers: backdated journals in R2R, duplicate invoice detections across APAC entities, and two open SoD conflicts in finance roles<span className="font-mono text-[#737373]"> [#2][#3]</span>.
            </p>
            <p>
              Remediation SLA is tracking at <span className="font-mono tabular-nums">{fmtPct(k.remediation_sla_pct)}</span>. Recommend immediate CFO review of priority-1 cases before close cutoff.
              <span className="block mt-2 font-mono text-[10px] uppercase tracking-wider text-[#FF9F0A]">ACTION_REVIEW: human approval required</span>
            </p>
          </div>
          <button
            data-testid="open-copilot-btn"
            onClick={() => nav("/app/copilot")}
            className="mt-5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#0A84FF] hover:text-white transition-colors"
          >
            Ask copilot <ArrowRight size={12} />
          </button>
          </SectionCard>
        </div>

        {/* Trends + Top risks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <SectionCard kicker="8-WEEK TREND" title="Readiness" bodyClassName="p-5">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.trends}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="week" stroke="#525252" style={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} tick={{ fill: "#525252" }} />
              <YAxis domain={[50, 100]} stroke="#525252" style={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} tick={{ fill: "#525252" }} />
              <Tooltip contentStyle={{ background: "#141414", border: "1px solid #404040", borderRadius: 0, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
              <Area type="monotone" dataKey="readiness" stroke="#30D158" strokeWidth={1.5} fill="url(#greenArea)" />
              <defs>
                <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#30D158" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#30D158" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
          </SectionCard>
          <SectionCard kicker="8-WEEK TREND" title="Control failures" bodyClassName="p-5">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.trends}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="week" stroke="#525252" style={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} tick={{ fill: "#525252" }} />
              <YAxis stroke="#525252" style={{ fontSize: 10 }} tick={{ fill: "#525252" }} />
              <Tooltip contentStyle={{ background: "#141414", border: "1px solid #404040", borderRadius: 0 }} />
              <Line type="monotone" dataKey="control_fail_count" stroke="#FF9F0A" strokeWidth={1.5} dot={{ fill: "#FF9F0A", r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          </SectionCard>
          <SectionCard kicker="8-WEEK TREND" title="Financial exposure" bodyClassName="p-5">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.trends}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="week" stroke="#525252" style={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} tick={{ fill: "#525252" }} />
              <YAxis stroke="#525252" style={{ fontSize: 10 }} tick={{ fill: "#525252" }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "#141414", border: "1px solid #404040", borderRadius: 0 }} formatter={(v) => `$${(v/1000000).toFixed(2)}M`} />
              <Line type="monotone" dataKey="exposure" stroke="#FF3B30" strokeWidth={1.5} dot={{ fill: "#FF3B30", r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Top risks + Top failing controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard
            className="lg:col-span-2 overflow-hidden"
            title="Top unresolved risks"
            kicker="RISK"
            right={<span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">by severity × exposure</span>}
          >
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[60vh]" testId="cfo-top-risks-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>Issue</DataTableTh>
                  <DataTableTh className="w-28">Severity</DataTableTh>
                  <DataTableTh className="w-28">Entity</DataTableTh>
                  <DataTableTh align="right" className="w-32">Exposure</DataTableTh>
                  <DataTableTh className="w-12" />
                </tr>
              </DataTableHead>
              <DataTableBody>
                {filteredTopRisks.map((r) => (
                  <DataTableRow
                    key={r.id}
                    onClick={() => nav(`/app/evidence/${r.id}`)}
                    testId={`top-risk-${r.control_code}`}
                  >
                    <DataTableTd className="text-white">
                      <div className="text-sm truncate max-w-md">{r.title}</div>
                      <div className="font-mono text-[10px] text-[#737373] mt-0.5">{r.control_code} · {r.process}</div>
                    </DataTableTd>
                    <DataTableTd><SeverityBadge severity={r.severity} /></DataTableTd>
                    <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{r.entity}</DataTableTd>
                    <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(r.financial_exposure)}</DataTableTd>
                    <DataTableTd className="text-[#737373]"><ArrowRight size={14} /></DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-[#262626]">
            {filteredTopRisks.map((r) => (
              <button
                key={r.id}
                onClick={() => nav(`/app/evidence/${r.id}`)}
                className="w-full text-left p-4 hover:bg-[#0A0A0A]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white text-sm truncate">{r.title}</div>
                    <div className="font-mono text-[10px] text-[#737373] mt-1">{r.control_code} · {r.process} · {r.entity}</div>
                  </div>
                  <SeverityBadge severity={r.severity} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-mono text-xs text-[#A3A3A3]">Exposure</div>
                  <div className="font-mono tabular-nums text-white">{fmtUSD(r.financial_exposure)}</div>
                </div>
              </button>
            ))}
          </div>
          </SectionCard>

          <SectionCard kicker="CONTROLS" title="Top failing controls" data-testid="top-failing-controls">
            <div className="space-y-2">
              {data.top_failing_controls.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => nav(`/app/drill/control/${c.code}`)}
                  className="w-full flex items-start justify-between gap-3 border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur rounded-xl px-4 py-3 hover:bg-[#1F1F1F]/55 transition-colors"
                  data-testid={`top-failing-${c.code}`}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-mono text-[10px] text-[#737373]">{c.code}</div>
                    <div className="text-sm text-white truncate">{c.name}</div>
                    <div className="font-mono text-[10px] text-[#737373] mt-0.5">{c.process}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums text-xl text-[#FF3B30]">{c.exceptions}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">exceptions</div>
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

function Heatmap({ rows }) {
  const nav = useNavigate();
  // group by process
  const processes = [...new Set(rows.map(r => r.process))];
  const entities = [...new Set(rows.map(r => r.entity))];
  const map = {};
  rows.forEach(r => { map[`${r.entity}::${r.process}`] = r; });
  const cellColor = (v) => {
    if (v == null) return "#0A0A0A";
    if (v >= 85) return "rgba(48,209,88,0.20)";
    if (v >= 70) return "rgba(48,209,88,0.10)";
    if (v >= 55) return "rgba(255,159,10,0.18)";
    if (v >= 40) return "rgba(255,59,48,0.18)";
    return "rgba(255,59,48,0.35)";
  };
  const textColor = (v) => v >= 70 ? "#30D158" : v >= 55 ? "#FF9F0A" : "#FF3B30";

  return (
    <DataTable
      testId="heatmap"
      tableClassName="border-collapse"
      className="rounded-none border-0 bg-transparent"
      maxHeightClassName="max-h-none"
      stickyHeader={false}
    >
      <DataTableHead>
        <tr>
          <DataTableTh className="py-2 pr-3 pl-0">Process / Entity</DataTableTh>
          {entities.map(e => (
            <DataTableTh key={e} align="center" className="py-2 px-2 min-w-[90px]">
              {e}
            </DataTableTh>
          ))}
        </tr>
      </DataTableHead>
      <DataTableBody>
        {processes.map(p => (
          <DataTableRow key={p}>
            <DataTableTd className="text-sm text-white py-2 pr-3 border-t border-[#262626]">
              {p}
            </DataTableTd>
            {entities.map(e => {
              const cell = map[`${e}::${p}`];
              return (
                <DataTableTd key={e} className="border-t border-[#262626] border-l border-[#262626] !p-0 align-middle">
                  <div
                    className="h-14 flex flex-col items-center justify-center cursor-pointer hover:brightness-125 transition-all"
                    style={{ background: cellColor(cell?.readiness) }}
                    data-testid={`heatmap-${e}-${p}`}
                    onClick={() => nav(`/app/cases?process=${encodeURIComponent(p)}&entity=${e}`)}
                    title={cell ? `${p} · ${e} · open_high=${cell.open_high}` : "—"}
                  >
                    {cell ? (
                      <>
                        <span className="font-mono tabular-nums text-sm" style={{ color: textColor(cell.readiness) }}>{cell.readiness.toFixed(0)}</span>
                        <span className="font-mono text-[9px] text-[#737373]">{cell.open_high} hi/crit</span>
                      </>
                    ) : <span className="text-[#525252]">—</span>}
                  </div>
                </DataTableTd>
              );
            })}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
