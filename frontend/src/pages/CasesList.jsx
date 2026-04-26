import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { http } from "../lib/api";
import { SeverityBadge, StatusBadge, PriorityTag } from "../components/Badges";
import { fmtUSD, fmtDate } from "../lib/format";
import { MagnifyingGlass } from "@phosphor-icons/react";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function CasesList() {
  const [all, setAll] = useState([]);
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [severity, setSeverity] = useState(searchParams.get("severity") || "");
  const [processFilter, setProcessFilter] = useState(searchParams.get("process") || "");
  const [entity, setEntity] = useState(searchParams.get("entity") || "");
  const nav = useNavigate();

  useEffect(() => {
    // Pull both open cases and promote top open exceptions as shadow cases (if none)
    Promise.all([
      http.get("/cases"),
      http.get("/exceptions?limit=200"),
    ]).then(([cases, exs]) => {
      const realIds = new Set(cases.data.map(c => c.exception_id));
      const shadow = exs.data.filter(e => !realIds.has(e.id)).slice(0, 100).map(e => ({
        id: `shadow-${e.id}`,
        exception_id: e.id,
        title: e.title,
        summary: e.summary,
        control_code: e.control_code,
        control_name: e.control_name,
        severity: e.severity,
        priority: e.severity === "critical" ? "P1" : e.severity === "high" ? "P2" : "P3",
        status: "open",
        owner_email: "—",
        owner_name: "—",
        financial_exposure: e.financial_exposure,
        entity: e.entity,
        process: e.process,
        detected_at: e.detected_at,
        opened_at: e.detected_at,
        due_date: e.detected_at,
        is_shadow: true,
      }));
      setAll([...cases.data, ...shadow]);
    });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter(c => {
      if (status && c.status !== status) return false;
      if (severity && c.severity !== severity) return false;
      if (processFilter && c.process !== processFilter) return false;
      if (entity && c.entity !== entity) return false;
      if (term && !(
        c.title?.toLowerCase().includes(term) ||
        c.control_code?.toLowerCase().includes(term) ||
        c.entity?.toLowerCase().includes(term)
      )) return false;
      return true;
    });
  }, [all, q, status, severity, processFilter, entity]);

  const openCase = async (c) => {
    if (!c.is_shadow) {
      nav(`/app/cases/${c.id}`);
      return;
    }
    // promote exception to case
    const { data: created } = await http.post(`/cases/from-exception?exception_id=${c.exception_id}`);
    nav(`/app/cases/${created.id}`);
  };

  return (
    <PageShell maxWidth="max-w-[1700px]">
      <div data-testid="cases-list">
        <PageHeader
          kicker="ALL CASES & OPEN EXCEPTIONS"
          title="Cases · remediation"
          subtitle="Triage exceptions, manage remediation, and keep evidence and governance in one place."
        />

        <InsightPanel section="cases" title="Cases · AI Insights" />

        <SectionCard
          kicker="FILTERS"
          title="Search & triage"
          right={
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              {filtered.length} of {all.length}
            </span>
          }
          className="mb-4"
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px] max-w-xl">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                data-testid="case-search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search cases, control codes, entities…"
                className="w-full bg-[#141414]/70 backdrop-blur border border-[#262626] pl-9 pr-3 h-10 text-sm text-white focus:border-white outline-none rounded-xl"
              />
            </div>
            <select
              data-testid="filter-status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 h-10 text-xs font-mono uppercase tracking-wider text-white outline-none focus:border-white rounded-xl"
            >
              <option value="">All status</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option>
            </select>
            <select
              data-testid="filter-severity"
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 h-10 text-xs font-mono uppercase tracking-wider text-white outline-none focus:border-white rounded-xl"
            >
              <option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            {(processFilter || entity) && (
              <span className="wow-badge px-3 h-10 inline-flex items-center gap-2 text-[#0A84FF] text-xs font-mono uppercase tracking-wider">
                {processFilter && `process: ${processFilter}`}{processFilter && entity && " · "}{entity && `entity: ${entity}`}
                <button onClick={() => { setProcessFilter(""); setEntity(""); }} className="text-[#0A84FF] hover:text-white" data-testid="clear-filters">×</button>
              </span>
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="CASES" title="All cases" bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="cases-list-table">
            <DataTableHead>
              <tr>
                <DataTableTh>Issue</DataTableTh>
                <DataTableTh className="w-24">Priority</DataTableTh>
                <DataTableTh className="w-28">Severity</DataTableTh>
                <DataTableTh className="w-32">Status</DataTableTh>
                <DataTableTh className="w-48">Owner</DataTableTh>
                <DataTableTh align="right" className="w-32">Exposure</DataTableTh>
                <DataTableTh className="w-32">Detected</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {filtered.map(c => (
                <DataTableRow
                  key={c.id}
                  onClick={() => openCase(c)}
                  testId={`case-row-${c.id}`}
                >
                  <DataTableTd>
                    <div className="text-sm text-white truncate max-w-xl">{c.title}</div>
                    <div className="font-mono text-[10px] text-[#737373]">{c.control_code} · {c.entity} · {c.process}</div>
                  </DataTableTd>
                  <DataTableTd><PriorityTag priority={c.priority} /></DataTableTd>
                  <DataTableTd><SeverityBadge severity={c.severity} /></DataTableTd>
                  <DataTableTd>{c.is_shadow ? <span className="font-mono text-[10px] uppercase text-[#737373]">unassigned</span> : <StatusBadge status={c.status} />}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3] truncate">{c.owner_name || c.owner_email}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(c.financial_exposure)}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#737373]">{fmtDate(c.detected_at)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      </div>
    </PageShell>
  );
}
