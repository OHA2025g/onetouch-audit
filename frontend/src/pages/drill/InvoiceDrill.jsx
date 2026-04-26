import React from "react";
import { Link } from "react-router-dom";
import { fmtUSD, fmtDate } from "../../lib/format";
import { Warning } from "@phosphor-icons/react";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function InvoiceDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626]">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Invoice</h3>
          <KV k="Invoice #" v={p.invoice_number} mono />
          <KV k="Vendor" v={data.vendor?.vendor_name || p.vendor_name} link={data.vendor && `/app/drill/vendor/${data.vendor.id}`} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Date" v={fmtDate(p.invoice_date)} mono />
          <KV k="Amount" v={fmtUSD(p.amount)} mono />
          <KV k="Tax" v={`${fmtUSD(p.tax_amount)} (expected ${fmtUSD(p.expected_tax_amount)})`} mono />
          <KV k="Status" v={p.status} />
          <KV k="Approver" v={p.approver_email || "— MISSING —"} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Purchase chain</h3>
          {data.purchase_order ? (
            <>
              <KV k="PO #" v={data.purchase_order.po_number} mono />
              <KV k="PO amount" v={fmtUSD(data.purchase_order.amount)} mono />
              <KV k="PO date" v={fmtDate(data.purchase_order.po_date)} mono />
              {data.goods_receipt ? (
                <>
                  <KV k="GRN #" v={data.goods_receipt.grn_number} mono />
                  <KV k="GRN amount" v={fmtUSD(data.goods_receipt.amount)} mono />
                  <KV k="GRN date" v={fmtDate(data.goods_receipt.receipt_date)} mono />
                </>
              ) : <div className="font-mono text-xs text-[#FF9F0A] py-3">No GRN</div>}
              <div className="mt-3 p-2 bg-[#0A0A0A] border border-[#262626]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">3-way variance</div>
                <div className="font-mono tabular-nums text-sm text-white mt-1">
                  {((Math.abs(p.amount - (data.purchase_order.amount || 0)) / Math.max(1, data.purchase_order.amount)) * 100).toFixed(1)}%
                </div>
              </div>
            </>
          ) : <div className="font-mono text-xs text-[#737373]">No PO linked (direct invoice).</div>}
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Payment trail</h3>
          {data.payments.length === 0 ? (
            <div className="font-mono text-xs text-[#737373]">Unpaid.</div>
          ) : (
            <div className="space-y-2">
              {data.payments.map(pay => (
                <Link key={pay.id} to={`/app/drill/payment/${pay.id}`} className="block border border-[#262626] bg-[#0A0A0A] p-3 hover:bg-[#1F1F1F]">
                  <div className="font-mono text-[10px] text-[#737373]">{pay.bank_reference} · {fmtDate(pay.payment_date)}</div>
                  <div className="font-mono tabular-nums text-sm text-white">{fmtUSD(pay.amount)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.duplicates?.length > 0 && (
        <>
          <SectionTitle count={data.duplicates.length}>Potential duplicates of this invoice</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.duplicates.map(d => (
              <Link key={d.id} to={`/app/drill/invoice/${d.id}`} className="border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-3 hover:bg-[#FF3B30]/10 transition-colors flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-white">{d.invoice_number}</div>
                  <div className="font-mono text-[10px] text-[#737373]">{fmtDate(d.invoice_date)} · {d.entity}</div>
                </div>
                <Warning size={14} className="text-[#FF3B30]" />
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />

      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
