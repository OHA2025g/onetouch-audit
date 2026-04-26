import React from "react";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList, Stat } from "./shared";

export default function CapExDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Budget" v={fmtUSD(p.budget_amount)} />
        <Stat k="Actual" v={fmtUSD(p.actual_amount)} severity={s.variance > 0 ? "critical" : "success"} />
        <Stat k="Variance" v={fmtUSD(s.variance)} severity={s.variance > 0 ? "critical" : "success"} />
        <Stat k="Variance %" v={`${s.variance_pct.toFixed(1)}%`} severity={s.variance > 0 ? "critical" : "success"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Project</h3>
          <KV k="Code" v={p.project_code} mono />
          <KV k="Name" v={p.project_name} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Sponsor" v={p.sponsor} />
          <KV k="Start" v={fmtDate(p.start_date)} mono />
          <KV k="Status" v={p.status} />
        </div>
      </div>
      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
