import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { SeverityBadge } from "../components/Badges";
import { fmtDate } from "../lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function ComplianceDashboard() {
  const [d, setD] = useState(null);
  const nav = useNavigate();
  useEffect(() => { http.get("/dashboard/compliance").then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-8 font-mono text-xs uppercase tracking-wider text-[#737373]">Loading compliance…</div>;
  const k = d.kpis;

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div data-testid="compliance-dashboard">
        <PageHeader
          kicker="COMPLIANCE & RISK"
          title="Access & policy"
          subtitle="Monitor SoD conflicts, access violations, and policy breach risk with evidence-first traceability."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="SoD conflicts" value={k.sod_conflicts} severity="critical" testId="kpi-sod" />
          <StatCard label="Terminated user activity" value={k.terminated_user_activity} severity="critical" testId="kpi-term" />
          <StatCard label="Tax mismatch open" value={k.tax_mismatch_open} severity="warning" testId="kpi-tax" />
          <StatCard label="Total open breaches" value={k.policy_breach_total} testId="kpi-breach" />
        </div>

        <InsightPanel section="compliance" title="Compliance AI Insights" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <SectionCard className="lg:col-span-2" kicker="ACCESS" title="SoD conflicts">
          <div className="space-y-2">
            {d.sod_conflicts.length === 0 && <div className="text-[#737373] font-mono text-xs">No SoD conflicts.</div>}
            {d.sod_conflicts.map(e => (
              <button
                type="button"
                key={e.id}
                onClick={() => nav(`/app/drill/user/${e.source_record_id}`)}
                className="w-full text-left border border-[#262626] p-4 bg-[#0A0A0A]/55 backdrop-blur cursor-pointer hover:bg-[#1F1F1F]/55 transition-colors rounded-xl"
                data-testid={`sod-${e.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-white">{e.title}</div>
                    <div className="font-mono text-[10px] text-[#737373] mt-0.5">{e.entity} · {fmtDate(e.detected_at)}</div>
                  </div>
                  <SeverityBadge severity={e.severity} />
                </div>
                <div className="mt-2 text-xs text-[#A3A3A3]">{e.summary}</div>
              </button>
            ))}
          </div>
          </SectionCard>

          <SectionCard kicker="AGEING" title="Exception aging">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.exception_aging}>
              <CartesianGrid stroke="#262626" vertical={false} />
              <XAxis dataKey="bucket" stroke="#525252" style={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} tick={{ fill: "#525252" }} />
              <YAxis stroke="#525252" tick={{ fill: "#525252", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#141414", border: "1px solid #404040", borderRadius: 0 }} />
              <Bar dataKey="count" fill="#FF9F0A" />
            </BarChart>
          </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard kicker="ACTIVITY" title={`Terminated / dormant user activity (${d.access_violations.length})`} bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[55vh]" testId="compliance-access-violations-table">
            <DataTableHead>
              <tr>
                <DataTableTh>User</DataTableTh>
                <DataTableTh>Entity</DataTableTh>
                <DataTableTh>Event</DataTableTh>
                <DataTableTh>Severity</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {d.access_violations.slice(0, 12).map(e => (
                <DataTableRow
                  key={e.id}
                  onClick={() => nav(`/app/drill/user/${e.source_record_id}`)}
                  testId={`access-${e.id}`}
                >
                  <DataTableTd className="text-white font-mono text-xs">{e.summary.split(" ").slice(2, 4).join(" ")}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{e.entity}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3]">{e.title}</DataTableTd>
                  <DataTableTd><SeverityBadge severity={e.severity} /></DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      </div>
    </PageShell>
  );
}
