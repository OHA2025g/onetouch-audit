import React from "react";
import { fmtUSD, fmtDate, fmtNum } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, Stat } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function EmployeeDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Status" v={p.status.toUpperCase()} severity={p.status === "terminated" ? "critical" : "success"} />
        <Stat k="Payroll Entries" v={fmtNum(s.entry_count)} />
        <Stat k="Gross (LTM)" v={fmtUSD(s.total_gross)} />
        <Stat k="Net (LTM)" v={fmtUSD(s.total_net)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Profile</h3>
          <KV k="Code" v={p.employee_code} mono />
          <KV k="Email" v={p.email} mono />
          <KV k="Department" v={p.department} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Base salary" v={fmtUSD(p.base_salary)} mono />
          <KV k="Hired" v={fmtDate(p.hired_at)} mono />
          {p.terminated_at && <KV k="Terminated" v={fmtDate(p.terminated_at)} mono />}
        </div>
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Payroll entries ({data.payroll_entries.length})</h3>
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-96" testId="employee-drill-payroll-table">
            <DataTableHead>
              <tr>
                <DataTableTh>Period</DataTableTh>
                <DataTableTh align="right">Gross</DataTableTh>
                <DataTableTh align="right">Tax</DataTableTh>
                <DataTableTh align="right">Net</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.payroll_entries.map(pe => (
                <DataTableRow key={pe.id} onClick={() => nav(`/app/drill/payroll_entry/${pe.id}`)}>
                  <DataTableTd className="font-mono text-xs text-[#0A84FF]">{pe.period}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(pe.gross_amount)}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-[#A3A3A3]">{fmtUSD(pe.tax_amount)}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(pe.net_amount)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </div>
      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
    </>
  );
}
