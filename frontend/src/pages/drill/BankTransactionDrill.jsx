import React from "react";
import { fmtUSD, fmtDateTime } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";

export default function BankTransactionDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Transaction</h3>
          <KV k="Reference" v={p.reference} mono />
          <KV k="Direction" v={p.direction} />
          <KV k="Timestamp" v={fmtDateTime(p.txn_ts)} mono />
          <KV k="Amount" v={fmtUSD(p.amount)} mono />
          <KV k="Currency" v={p.currency} mono />
          <KV k="Counterparty" v={p.counterparty} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Bank account</h3>
          {data.bank_account ? (
            <>
              <KV k="Bank" v={data.bank_account.bank_name} />
              <KV k="Account" v={data.bank_account.account_number_masked} mono />
              <KV k="Entity" v={data.bank_account.entity} mono />
              <KV k="Currency" v={data.bank_account.currency} mono />
              <KV k="Balance" v={fmtUSD(data.bank_account.balance)} mono />
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
