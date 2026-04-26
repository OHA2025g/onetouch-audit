import React from "react";
import { fmtUSD, fmtDate, fmtDateTime, fmtNum } from "../../lib/format";
import { SectionTitle, ExceptionsTable, Stat } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function ControlDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Exceptions" v={fmtNum(s.exception_count)} severity={s.exception_count > 0 ? "critical" : "success"} />
        <Stat k="Total exposure" v={fmtUSD(s.total_exposure)} severity="critical" />
        <Stat k="Open cases" v={fmtNum(s.open_cases)} />
        <Stat k="Last run" v={p.last_run_at ? fmtDate(p.last_run_at) : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Control definition</h3>
          <p className="text-sm text-[#E5E5E5] leading-relaxed">{p.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-px bg-[#262626] border border-[#262626]">
            <div className="bg-[#0A0A0A] p-3"><div className="font-mono text-[10px] uppercase text-[#737373]">Process</div><div className="text-sm text-white mt-1">{p.process}</div></div>
            <div className="bg-[#0A0A0A] p-3"><div className="font-mono text-[10px] uppercase text-[#737373]">Risk</div><div className="text-sm text-white mt-1">{p.risk}</div></div>
            <div className="bg-[#0A0A0A] p-3"><div className="font-mono text-[10px] uppercase text-[#737373]">Criticality</div><div className="text-sm text-white mt-1">{p.criticality}</div></div>
            <div className="bg-[#0A0A0A] p-3"><div className="font-mono text-[10px] uppercase text-[#737373]">Framework</div><div className="text-sm text-white mt-1">{p.framework}</div></div>
          </div>
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">By entity</h3>
          {Object.entries(s.by_entity).length === 0 && <div className="font-mono text-xs text-[#737373]">No data.</div>}
          {Object.entries(s.by_entity).map(([e, c]) => (
            <div key={e} className="flex justify-between items-center py-2 border-b border-[#1F1F1F] last:border-0">
              <span className="font-mono text-sm text-white">{e}</span>
              <span className="font-mono tabular-nums text-sm text-[#FF9F0A]">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle count={data.recent_runs?.length}>Recent test runs</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-64" testId="control-drill-recent-runs-table">
        <DataTableHead>
          <tr>
            <DataTableTh>When</DataTableTh>
            <DataTableTh>Status</DataTableTh>
            <DataTableTh align="right">Exceptions</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.recent_runs.map(r => (
            <DataTableRow key={r.id}>
              <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDateTime(r.run_ts)}</DataTableTd>
              <DataTableTd className="font-mono text-xs" style={{ color: r.status === "success" ? "#30D158" : "#FF3B30" }}>{r.status}</DataTableTd>
              <DataTableTd align="right" className="font-mono tabular-nums">{r.exceptions_count}</DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <SectionTitle count={data.exceptions.length}>Exceptions from this control</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
    </>
  );
}
