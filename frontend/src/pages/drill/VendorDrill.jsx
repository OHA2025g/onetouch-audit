import React from "react";
import { fmtUSD, fmtDate, fmtNum } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, Stat } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function VendorDrill({ data, nav }) {
  const p = data.primary;
  const s = data.stats;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[#262626] border border-[#262626] mb-6">
        <Stat k="Invoices" v={fmtNum(s.invoice_count)} />
        <Stat k="Payments" v={fmtNum(s.payment_count)} />
        <Stat k="Invoiced (USD)" v={fmtUSD(s.total_invoiced)} />
        <Stat k="Paid (USD)" v={fmtUSD(s.total_paid)} />
        <Stat k="Exceptions" v={fmtNum(s.exception_count)} severity={s.exception_count > 0 ? "critical" : "success"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Vendor master</h3>
          <KV k="Vendor code" v={p.vendor_code} mono />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Status" v={p.status} />
          <KV k="Bank hash" v={p.bank_account_hash} mono />
          <KV k="Bank changed" v={fmtDate(p.bank_changed_at)} mono />
          <KV k="Created" v={fmtDate(p.created_at)} mono />
        </div>
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Recent invoices ({data.invoices.length})</h3>
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-96" testId="vendor-drill-invoices-table">
            <DataTableHead>
              <tr>
                <DataTableTh>#</DataTableTh>
                <DataTableTh>Date</DataTableTh>
                <DataTableTh align="right">Amount</DataTableTh>
                <DataTableTh>Status</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.invoices.map(i => (
                <DataTableRow key={i.id} onClick={() => nav(`/app/drill/invoice/${i.id}`)}>
                  <DataTableTd className="font-mono text-xs text-[#0A84FF]">{i.invoice_number}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">{fmtDate(i.invoice_date)}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(i.amount)}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">{i.status}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      </div>

      <SectionTitle count={data.payments.length}>Payments</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-72" testId="vendor-drill-payments-table">
        <DataTableHead>
          <tr>
            <DataTableTh>Ref</DataTableTh>
            <DataTableTh>Date</DataTableTh>
            <DataTableTh align="right">Amount</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.payments.map(pp => (
            <DataTableRow key={pp.id} onClick={() => nav(`/app/drill/payment/${pp.id}`)}>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{pp.bank_reference}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{fmtDate(pp.payment_date)}</DataTableTd>
              <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(pp.amount)}</DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
    </>
  );
}
