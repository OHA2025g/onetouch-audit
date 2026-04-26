import React from "react";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function ARInvoiceDrill({ data, nav }) {
  const p = data.primary;
  const now = new Date();
  const due = new Date(p.due_date);
  const daysOverdue = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Invoice</h3>
          <KV k="AR #" v={p.ar_number} mono />
          <KV k="Customer" v={data.customer?.customer_name || p.customer_name}
              link={data.customer && `/app/drill/customer/${data.customer.id}`} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Date" v={fmtDate(p.invoice_date)} mono />
          <KV k="Due" v={fmtDate(p.due_date)} mono />
          <KV k="Shipment" v={fmtDate(p.shipment_date)} mono />
          <KV k="Amount" v={fmtUSD(p.amount)} mono />
          <KV k="Status" v={p.status} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Aging</h3>
          {p.status === "open" ? (
            <div className={`font-mono text-2xl ${daysOverdue > 90 ? "text-[#FF3B30]" : daysOverdue > 0 ? "text-[#FF9F0A]" : "text-[#30D158]"}`}>
              {daysOverdue > 0 ? `+${daysOverdue}d overdue` : `${-daysOverdue}d remaining`}
            </div>
          ) : (
            <div className="font-mono text-xs text-[#30D158]">Paid / closed.</div>
          )}
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Receipts ({data.receipts.length})</h3>
          {data.receipts.length === 0 ? (
            <div className="font-mono text-xs text-[#737373]">No receipts received.</div>
          ) : data.receipts.map(r => (
            <div key={r.id} className="border border-[#262626] bg-[#0A0A0A] p-3 mb-2">
              <div className="font-mono text-[10px] text-[#737373]">{r.bank_reference} · {fmtDate(r.receipt_date)}</div>
              <div className="font-mono tabular-nums text-sm text-white">{fmtUSD(r.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
