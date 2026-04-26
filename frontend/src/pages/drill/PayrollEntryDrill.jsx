import React from "react";
import { Link } from "react-router-dom";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function PayrollEntryDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Entry</h3>
          <KV k="ID" v={p.id} mono />
          <KV k="Period" v={p.period} mono />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Gross" v={fmtUSD(p.gross_amount)} mono />
          <KV k="Tax" v={fmtUSD(p.tax_amount)} mono />
          <KV k="Net" v={fmtUSD(p.net_amount)} mono />
          <KV k="Status" v={p.status} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Employee</h3>
          {data.employee ? (
            <Link to={`/app/drill/employee/${data.employee.id}`} className="block border border-[#262626] bg-[#0A0A0A] p-4 hover:bg-[#1F1F1F]">
              <div className="text-sm text-white">{data.employee.full_name}</div>
              <div className="font-mono text-[10px] text-[#737373] mt-1">{data.employee.email} · {data.employee.department}</div>
              <div className={`font-mono text-xs mt-2 ${data.employee.status === "terminated" ? "text-[#FF3B30]" : "text-[#30D158]"}`}>
                {data.employee.status}
              </div>
            </Link>
          ) : <div className="font-mono text-xs text-[#737373]">—</div>}
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Payroll run</h3>
          {data.payroll_run ? (
            <>
              <KV k="Run ID" v={data.payroll_run.id} mono />
              <KV k="Run date" v={fmtDate(data.payroll_run.run_date)} mono />
              <KV k="Total gross" v={fmtUSD(data.payroll_run.total_gross)} mono />
              <KV k="Status" v={data.payroll_run.status} />
            </>
          ) : <div className="font-mono text-xs text-[#737373]">—</div>}
        </div>
      </div>
      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
