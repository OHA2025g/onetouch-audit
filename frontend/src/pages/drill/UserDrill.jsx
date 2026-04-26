import React from "react";
import { fmtUSD, fmtDate, fmtDateTime } from "../../lib/format";
import { PriorityTag } from "../../components/Badges";
import { KV, SectionTitle } from "./shared";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../../components/DataTable";

export default function UserDrill({ data, nav }) {
  const p = data.primary;
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626] mb-6">
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Identity</h3>
          <KV k="Name" v={p.full_name || "—"} />
          <KV k="Email" v={p.email} mono />
          <KV k="Role" v={p.role || "—"} />
          <KV k="Entity" v={p.entity || "—"} mono />
          <KV k="Status" v={p.status || "—"} />
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Assigned roles / SoD</h3>
          {data.roles.length === 0 && <div className="font-mono text-xs text-[#737373]">None.</div>}
          {data.roles.map((r, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[#1F1F1F] last:border-0">
              <span className="text-sm text-white">{r.role}</span>
              <span className="font-mono text-[10px] text-[#737373]">{r.entity}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#141414] p-5">
          <h3 className="font-heading text-base text-white tracking-tight mb-3">Assigned cases ({data.cases.length})</h3>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {data.cases.map(c => (
              <div key={c.id} onClick={() => nav(`/app/cases/${c.id}`)} className="cursor-pointer flex items-center justify-between gap-2 bg-[#0A0A0A] border border-[#262626] p-2 hover:bg-[#1F1F1F]">
                <div className="flex-1 min-w-0 text-xs text-white truncate">{c.title}</div>
                <PriorityTag priority={c.priority} />
              </div>
            ))}
            {data.cases.length === 0 && <div className="font-mono text-xs text-[#737373]">No cases.</div>}
          </div>
        </div>
      </div>

      <SectionTitle count={data.access_events.length}>Access events</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-64" testId="user-drill-access-events-table">
        <DataTableHead>
          <tr>
            <DataTableTh>When</DataTableTh>
            <DataTableTh>System</DataTableTh>
            <DataTableTh>Event</DataTableTh>
            <DataTableTh>Terminated?</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.access_events.map(e => (
            <DataTableRow key={e.id}>
              <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDateTime(e.event_ts)}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{e.system}</DataTableTd>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{e.event_type}</DataTableTd>
              <DataTableTd className="font-mono text-xs" style={{ color: e.user_terminated ? "#FF3B30" : "#30D158" }}>
                {e.user_terminated ? "YES ⚠" : "no"}
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <SectionTitle count={data.journals_posted?.length}>Journals posted by this user</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-60" testId="user-drill-journals-posted-table">
        <DataTableHead>
          <tr>
            <DataTableTh>#</DataTableTh>
            <DataTableTh>Posting</DataTableTh>
            <DataTableTh align="right">Amount</DataTableTh>
            <DataTableTh>Manual</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.journals_posted.map(j => (
            <DataTableRow key={j.id} onClick={() => nav(`/app/drill/journal/${j.id}`)}>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{j.journal_number}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{fmtDate(j.posting_date)}</DataTableTd>
              <DataTableTd align="right" className="font-mono tabular-nums text-white">{fmtUSD(j.total_amount)}</DataTableTd>
              <DataTableTd className="font-mono text-xs">{j.is_manual ? "yes" : "no"}</DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <SectionTitle count={data.audit_log.length}>Recent audit log</SectionTitle>
      <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-60" testId="user-drill-audit-log-table">
        <DataTableHead>
          <tr>
            <DataTableTh>When</DataTableTh>
            <DataTableTh>Action</DataTableTh>
            <DataTableTh>Object</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {data.audit_log.map(l => (
            <DataTableRow key={l.id}>
              <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDateTime(l.event_ts)}</DataTableTd>
              <DataTableTd className="font-mono text-xs text-[#0A84FF]">{l.action_type}</DataTableTd>
              <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{l.object_type}: {(l.object_id || "").slice(0, 20)}</DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
