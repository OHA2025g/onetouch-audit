import React from "react";
import { Link } from "react-router-dom";
import { fmtUSD, fmtDate, fmtDateTime } from "../../lib/format";
import { KV, SectionTitle, ExceptionsTable, CasesList } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function JournalDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626]">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Journal</h3>
          <KV k="Journal #" v={p.journal_number} mono />
          <KV k="Entity" v={p.entity} mono />
          <KV k="Posting date" v={fmtDate(p.posting_date)} mono />
          <KV k="Created at" v={fmtDateTime(p.created_at)} mono />
          <KV k="Amount" v={fmtUSD(p.total_amount)} mono />
          <KV k="Manual" v={p.is_manual ? "YES" : "no"} />
          <KV k="Privileged poster" v={p.is_privileged_poster ? "YES" : "no"} />
          <KV k="Approver" v={p.approver_email || "— MISSING —"} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Poster</h3>
          {data.creator ? (
            <Link to={`/app/drill/user/${data.creator.email}`} className="block border border-[#262626] bg-[#0A0A0A] p-4 hover:bg-[#1F1F1F]">
              <div className="font-mono text-[10px] text-[#737373]">{data.creator.role}</div>
              <div className="text-sm text-white mt-1">{data.creator.full_name || data.creator.email}</div>
              <div className="font-mono text-xs text-[#0A84FF] mt-2">{data.creator.email} →</div>
            </Link>
          ) : <div className="font-mono text-xs text-[#737373]">Unknown poster.</div>}
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Approver</h3>
          {data.approver ? (
            <Link to={`/app/drill/user/${data.approver.email}`} className="block border border-[#262626] bg-[#0A0A0A] p-4 hover:bg-[#1F1F1F]">
              <div className="text-sm text-white">{data.approver.full_name || data.approver.email}</div>
              <div className="font-mono text-xs text-[#0A84FF] mt-2">{data.approver.email} →</div>
            </Link>
          ) : <div className="font-mono text-xs text-[#FF3B30] border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-3">⚠ No approver documented.</div>}
        </div>
      </div>

      <SectionTitle count={data.recent_by_same_user?.length}>Recent journals by the same user</SectionTitle>
      <DataTable maxHeightClassName="max-h-[50vh]" testId="journal-drill-recent-journals-table">
        <DataTableHead>
          <tr>
            <DataTableTh>Journal #</DataTableTh>
            <DataTableTh>Posting</DataTableTh>
            <DataTableTh>Entity</DataTableTh>
            <DataTableTh align="right">Amount</DataTableTh>
            <DataTableTh>Manual</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.recent_by_same_user.map(j => (
            <DataTableRow key={j.id} onClick={() => nav(`/app/drill/journal/${j.id}`)}>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{j.journal_number}</DataTableTd>
              <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDate(j.posting_date)}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{j.entity}</DataTableTd>
              <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(j.total_amount)}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{j.is_manual ? "yes" : "no"}</DataTableTd>
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
