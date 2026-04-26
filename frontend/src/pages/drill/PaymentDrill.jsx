import React from "react";
import { Link } from "react-router-dom";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function PaymentDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626]">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Payment</h3>
          <KV k="Reference" v={p.bank_reference} mono />
          <KV k="Vendor" v={data.vendor?.vendor_name || p.vendor_name} link={data.vendor && `/app/drill/vendor/${data.vendor.id}`} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Date" v={fmtDate(p.payment_date)} mono />
          <KV k="Amount" v={fmtUSD(p.amount)} mono />
        </div>
        <div className="bg-[#141414] p-5 lg:col-span-2">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Linked invoice</h3>
          {data.invoice ? (
            <Link to={`/app/drill/invoice/${data.invoice.id}`} className="block border border-[#262626] bg-[#0A0A0A] p-4 hover:bg-[#1F1F1F] transition-colors">
              <div className="font-mono text-xs text-[#0A84FF]">{data.invoice.invoice_number} →</div>
              <div className="text-sm text-white mt-1">{data.invoice.vendor_name}</div>
              <div className="grid grid-cols-3 gap-4 mt-3 font-mono text-xs text-[#A3A3A3]">
                <div><span className="text-[#737373]">Amount</span><div className="text-white tabular-nums">{fmtUSD(data.invoice.amount)}</div></div>
                <div><span className="text-[#737373]">Invoice date</span><div className="text-white">{fmtDate(data.invoice.invoice_date)}</div></div>
                <div><span className="text-[#737373]">Status</span><div className="text-white">{data.invoice.status}</div></div>
              </div>
            </Link>
          ) : <div className="font-mono text-xs text-[#737373]">No invoice linked.</div>}
        </div>
      </div>

      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />

      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
