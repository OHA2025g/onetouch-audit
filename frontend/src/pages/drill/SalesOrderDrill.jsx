import React from "react";
import { fmtUSD, fmtDate } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function SalesOrderDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Sales Order</h3>
          <KV k="SO #" v={p.so_number} mono />
          <KV k="Customer" v={data.customer?.customer_name || p.customer_name}
              link={data.customer && `/app/drill/customer/${data.customer.id}`} />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Amount" v={fmtUSD(p.amount)} mono />
          <KV k="SO date" v={fmtDate(p.so_date)} mono />
          <KV k="Ship date" v={fmtDate(p.ship_date)} mono />
          <KV k="Status" v={p.status} />
        </div>
        {data.customer && (
          <div className="bg-[#141414] p-5">
            <h3 className="font-heading text-base text-white tracking-tight mb-3">Customer credit profile</h3>
            <KV k="Credit limit" v={fmtUSD(data.customer.credit_limit)} mono />
            <KV k="Payment terms" v={`Net ${data.customer.payment_terms_days}d`} mono />
            <KV k="Status" v={data.customer.status} />
          </div>
        )}
      </div>
      <SectionTitle count={data.exceptions.length}>Exceptions</SectionTitle>
      <ExceptionsTable exceptions={data.exceptions} nav={nav} />
      <SectionTitle count={data.cases.length}>Cases</SectionTitle>
      <CasesList cases={data.cases} nav={nav} />
    </>
  );
}
