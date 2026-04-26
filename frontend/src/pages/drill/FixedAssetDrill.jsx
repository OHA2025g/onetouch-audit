import React from "react";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList, Stat } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function FixedAssetDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Cost" v={fmtUSD(p.cost)} />
        <Stat k="Accumulated Dep." v={fmtUSD(s.accumulated_depreciation)} />
        <Stat k="Net Book Value" v={fmtUSD(s.net_book_value)} />
        <Stat k="Status" v={p.status.toUpperCase()} severity={p.status === "disposed" ? "critical" : "success"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Asset master</h3>
          <KV k="Code" v={p.asset_code} mono />
          <KV k="Name" v={p.asset_name} />
          <KV k="Category" v={p.category} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="In service" v={fmtDate(p.in_service_date)} mono />
          <KV k="Useful life" v={`${p.useful_life_months} months`} mono />
          <KV k="Monthly dep." v={fmtUSD(p.monthly_depreciation)} mono />
          {p.disposed_at && <KV k="Disposed" v={fmtDate(p.disposed_at)} mono />}
        </div>
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Depreciation schedule ({data.depreciation.length})</h3>
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-80" testId="fixed-asset-drill-depreciation-table">
            <DataTableHead>
              <tr>
                <DataTableTh>Period</DataTableTh>
                <DataTableTh align="right">Amount</DataTableTh>
                <DataTableTh>Posted</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.depreciation.map(dep => (
                <DataTableRow key={dep.id}>
                  <DataTableTd className="font-mono text-xs text-[#0A84FF]">{dep.period}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(dep.amount)}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDate(dep.posted_at)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </div>
      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
