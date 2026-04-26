import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { SeverityBadge } from "../components/Badges";
import { fmtUSD, fmtDate } from "../lib/format";
import { toast } from "sonner";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function ControllerDashboard() {
  const [d, setD] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    http.get("/dashboard/controller").then(r => setD(r.data)).catch(() => toast.error("Load failed"));
  }, []);

  if (!d) return <div className="p-8 font-mono text-xs uppercase tracking-wider text-[#737373]">Loading controller view…</div>;
  const k = d.kpis;

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div data-testid="controller-dashboard">
        <PageHeader
          kicker="FINANCIAL CONTROLLER"
          title="Close control room"
          subtitle="Stay ahead of close-impacting exceptions, reconciliations, and AP risk."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label="Close blockers" value={k.close_blockers} severity="critical" testId="kpi-blockers" />
          <StatCard label="Manual JE breaches" value={k.manual_je_breaches} severity="warning" testId="kpi-je" />
          <StatCard label="Backdated journals" value={k.backdated_journals} severity="critical" testId="kpi-backdated" />
          <StatCard label="AP exception queue" value={k.ap_exception_count} testId="kpi-ap" />
          <StatCard label="Recons overdue" value={k.reconciliations_overdue} unit={`/${k.reconciliations_total}`} severity="warning" testId="kpi-recons" />
          <StatCard label="Total recons" value={k.reconciliations_total} testId="kpi-recons-total" />
        </div>

        <InsightPanel section="controller" title="Controller AI Insights" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard kicker="CLOSE" title="Reconciliations">
            <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[55vh]" testId="controller-reconciliations-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>Type / Entity</DataTableTh>
                  <DataTableTh>Period</DataTableTh>
                  <DataTableTh align="right">Variance</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {d.reconciliations.map(r => (
                  <DataTableRow key={r.id} testId={`recon-${r.id}`}>
                    <DataTableTd className="text-white">
                      <div className="truncate">{r.reconciliation_type}</div>
                      <div className="font-mono text-[10px] text-[#737373]">{r.entity}</div>
                    </DataTableTd>
                    <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{r.period}</DataTableTd>
                    <DataTableTd align="right" className="font-mono tabular-nums" style={{ color: Math.abs(r.variance_amount) > 5000 ? "#FF3B30" : "#A3A3A3" }}>
                      {fmtUSD(r.variance_amount)}
                    </DataTableTd>
                    <DataTableTd>
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${
                        r.status === "overdue" ? "bg-[#FF3B30]/10 text-[#FF3B30]" :
                        r.status === "closed" ? "bg-[#30D158]/10 text-[#30D158]" :
                        "bg-[#FF9F0A]/10 text-[#FF9F0A]"
                      }`}>{r.status}</span>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </SectionCard>

          <SectionCard kicker="ACCOUNTS PAYABLE" title="Top AP exceptions">
          <div className="space-y-2">
            {d.ap_exceptions.map(e => (
              <button
                type="button"
                key={e.id}
                onClick={() => nav(`/app/evidence/${e.id}`)}
                className="w-full text-left border border-[#262626] p-4 bg-[#0A0A0A]/55 backdrop-blur hover:bg-[#1F1F1F]/55 transition-colors cursor-pointer rounded-xl"
                data-testid={`ap-exc-${e.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{e.title}</div>
                    <div className="font-mono text-[10px] text-[#737373] mt-0.5">{e.control_code} · {e.entity} · {fmtDate(e.detected_at)}</div>
                  </div>
                  <SeverityBadge severity={e.severity} />
                </div>
                <div className="mt-2 font-mono tabular-nums text-sm text-[#FF3B30]">{fmtUSD(e.financial_exposure)}</div>
              </button>
            ))}
          </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
