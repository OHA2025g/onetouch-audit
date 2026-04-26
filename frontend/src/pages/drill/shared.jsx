// Shared primitives reused across all drill renderers.
import React from "react";
import { Link } from "react-router-dom";
import { fmtUSD } from "../../lib/format";
import { SeverityBadge, StatusBadge, PriorityTag } from "../../components/Badges";
import { ArrowRight } from "@phosphor-icons/react";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export const KV = ({ k, v, mono, link }) => (
  <div className="flex items-baseline justify-between gap-3 py-2 border-b border-[#1F1F1F] last:border-0">
    <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">{k}</span>
    {link ? (
      <Link to={link} className="text-sm text-[#0A84FF] hover:text-white transition-colors truncate max-w-[60%]">{v}</Link>
    ) : (
      <span className={`text-sm text-white truncate max-w-[60%] ${mono ? "font-mono tabular-nums" : ""}`}>{v}</span>
    )}
  </div>
);

export const SectionTitle = ({ children, count }) => (
  <div className="flex items-center justify-between mb-3 mt-6">
    <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373]">{children}</h3>
    {count != null && <span className="font-mono text-[10px] uppercase tracking-wider text-[#525252]">{count}</span>}
  </div>
);

export const Stat = ({ k, v, severity }) => (
  <div className="bg-[#141414] p-4">
    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">{k}</div>
    <div className={`font-mono tabular-nums text-2xl mt-2 ${
      severity === "critical" ? "text-[#FF3B30]" : severity === "success" ? "text-[#30D158]" : "text-white"
    }`}>{v}</div>
  </div>
);

export function ExceptionsTable({ exceptions, nav }) {
  if (!exceptions?.length) return <div className="font-mono text-xs text-[#525252] py-4">No exceptions.</div>;
  return (
    <DataTable maxHeightClassName="max-h-[55vh]" testId="drill-exceptions-table">
      <DataTableHead>
        <tr>
          <DataTableTh>Control</DataTableTh>
          <DataTableTh>Title</DataTableTh>
          <DataTableTh className="w-24">Severity</DataTableTh>
          <DataTableTh align="right" className="w-28">Exposure</DataTableTh>
          <DataTableTh align="right" className="w-20">Anomaly</DataTableTh>
          <DataTableTh className="w-10" />
        </tr>
      </DataTableHead>
      <DataTableBody>
        {exceptions.map(e => (
          <DataTableRow key={e.id} onClick={() => nav(`/app/evidence/${e.id}`)}>
            <DataTableTd className="font-mono text-xs text-white">{e.control_code}</DataTableTd>
            <DataTableTd className="text-sm text-white truncate max-w-md">{e.title}</DataTableTd>
            <DataTableTd><SeverityBadge severity={e.severity} /></DataTableTd>
            <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(e.financial_exposure)}</DataTableTd>
            <DataTableTd align="right" className="font-mono tabular-nums text-[#FF9F0A]">{e.anomaly_score?.toFixed(2) || "—"}</DataTableTd>
            <DataTableTd className="text-[#737373]"><ArrowRight size={12} /></DataTableTd>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

export function CasesList({ cases, nav }) {
  if (!cases?.length) return <div className="font-mono text-xs text-[#525252] py-4">No cases opened.</div>;
  return (
    <div className="space-y-1">
      {cases.map(c => (
        <div key={c.id} className="flex items-center justify-between gap-2 bg-[#141414] border border-[#262626] p-3 cursor-pointer hover:bg-[#1F1F1F] transition-colors"
             onClick={() => nav(`/app/cases/${c.id}`)}>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{c.title}</div>
            <div className="font-mono text-[10px] text-[#737373] mt-0.5">Case {c.id.slice(0, 6)} · owner {c.owner_email}</div>
          </div>
          <div className="flex items-center gap-2">
            <PriorityTag priority={c.priority} /><StatusBadge status={c.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
