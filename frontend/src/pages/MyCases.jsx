import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { SeverityBadge, StatusBadge, PriorityTag } from "../components/Badges";
import { fmtUSD, fmtDate, daysFromNow } from "../lib/format";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function MyCases() {
  const [d, setD] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    http.get("/dashboard/my-cases").then(r => setD(r.data)).catch(() => toast.error("Load failed"));
  }, []);

  if (!d) return <div className="p-8 font-mono text-xs uppercase tracking-wider text-[#737373]">Loading your queue…</div>;

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div data-testid="my-cases">
        <PageHeader
          kicker="MY WORK"
          title="My cases"
          subtitle="Your assigned remediation queue with SLA context and evidence-first drilldowns."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard label="Open cases" value={d.kpis.my_open_cases} testId="kpi-mine-open" />
          <StatCard label="Overdue" value={d.kpis.overdue} severity={d.kpis.overdue > 0 ? "critical" : "success"} testId="kpi-mine-overdue" />
          <StatCard label="Total assigned" value={d.kpis.total_assigned} testId="kpi-mine-total" />
        </div>

        <InsightPanel section="my-cases" title="My Work · AI Insights" />

        {d.cases.length === 0 ? (
          <SectionCard kicker="QUEUE" title="Assigned cases">
            <div className="text-[#737373] font-mono text-xs text-center py-10">
              No cases assigned to you.
            </div>
          </SectionCard>
        ) : (
          <SectionCard kicker="QUEUE" title={`Assigned cases (${d.cases.length})`} bodyClassName="p-0">
            <DataTable maxHeightClassName="max-h-[65vh]" testId="my-cases-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>Case</DataTableTh>
                  <DataTableTh className="w-24">Priority</DataTableTh>
                  <DataTableTh className="w-28">Severity</DataTableTh>
                  <DataTableTh className="w-32">Status</DataTableTh>
                  <DataTableTh align="right" className="w-32">Exposure</DataTableTh>
                  <DataTableTh className="w-32">Due</DataTableTh>
                  <DataTableTh className="w-10" />
                </tr>
              </DataTableHead>
              <DataTableBody>
                {d.cases.map(c => {
                  const dd = daysFromNow(c.due_date);
                  return (
                    <DataTableRow
                      key={c.id}
                      onClick={() => nav(`/app/cases/${c.id}`)}
                      testId={`mycase-${c.id}`}
                    >
                      <DataTableTd>
                        <div className="text-sm text-white truncate max-w-lg">{c.title}</div>
                        <div className="font-mono text-[10px] text-[#737373]">{c.control_code} · {c.entity} · {c.process}</div>
                      </DataTableTd>
                      <DataTableTd><PriorityTag priority={c.priority} /></DataTableTd>
                      <DataTableTd><SeverityBadge severity={c.severity} /></DataTableTd>
                      <DataTableTd><StatusBadge status={c.status} /></DataTableTd>
                      <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(c.financial_exposure)}</DataTableTd>
                      <DataTableTd>
                        <div className="font-mono text-xs text-white">{fmtDate(c.due_date)}</div>
                        <div className={`font-mono text-[10px] ${dd < 0 ? "text-[#FF3B30]" : dd < 3 ? "text-[#FF9F0A]" : "text-[#737373]"}`}>
                          {dd < 0 ? `${Math.abs(dd)}d overdue` : `${dd}d remaining`}
                        </div>
                      </DataTableTd>
                      <DataTableTd><ArrowRight size={14} className="text-[#737373]" /></DataTableTd>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </SectionCard>
        )}
      </div>
    </PageShell>
  );
}
