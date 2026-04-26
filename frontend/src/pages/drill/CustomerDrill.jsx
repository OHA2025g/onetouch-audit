import React from "react";
import { fmtUSD, fmtDate, fmtNum } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList, Stat } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function CustomerDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Credit Limit" v={fmtUSD(s.credit_limit)} />
        <Stat k="Open Exposure" v={fmtUSD(s.open_exposure)} severity={s.over_limit > 0 ? "critical" : "success"} />
        <Stat k="Over Limit" v={fmtUSD(s.over_limit)} severity={s.over_limit > 0 ? "critical" : "success"} />
        <Stat k="Sales Orders" v={fmtNum(s.sales_order_count)} />
        <Stat k="AR Invoices" v={fmtNum(s.ar_invoice_count)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Customer master</h3>
          <KV k="Code" v={p.customer_code} mono />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Status" v={p.status} />
          <KV k="Terms" v={`Net ${p.payment_terms_days}d`} mono />
          <KV k="Created" v={fmtDate(p.created_at)} mono />
        </div>
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">AR Invoices ({data.ar_invoices.length})</h3>
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-80" testId="customer-drill-ar-invoices-table">
            <DataTableHead>
              <tr>
                <DataTableTh>#</DataTableTh>
                <DataTableTh>Date</DataTableTh>
                <DataTableTh>Due</DataTableTh>
                <DataTableTh align="right">Amount</DataTableTh>
                <DataTableTh>Status</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.ar_invoices.map(i => (
                <DataTableRow key={i.id} onClick={() => nav(`/app/drill/ar_invoice/${i.id}`)}>
                  <DataTableTd className="font-mono text-xs text-[#0A84FF]">{i.ar_number}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">{fmtDate(i.invoice_date)}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">{fmtDate(i.due_date)}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(i.amount)}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">{i.status}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      <SectionTitle count={data.sales_orders.length}>Sales Orders</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-60" testId="customer-drill-sales-orders-table">
        <DataTableHead>
          <tr>
            <DataTableTh>SO #</DataTableTh>
            <DataTableTh>Date</DataTableTh>
            <DataTableTh align="right">Amount</DataTableTh>
            <DataTableTh>Status</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.sales_orders.map(so => (
            <DataTableRow key={so.id} onClick={() => nav(`/app/drill/sales_order/${so.id}`)}>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{so.so_number}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{fmtDate(so.so_date)}</DataTableTd>
              <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(so.amount)}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{so.status}</DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
