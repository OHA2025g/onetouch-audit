import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { toast } from "sonner";
import { fmtDateTime } from "../lib/format";
import { Play, CheckCircle, Warning } from "@phosphor-icons/react";
import clsx from "clsx";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function AuditWorkspace() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState({ process: "", crit: "" });

  const load = async () => {
    const { data } = await http.get("/dashboard/audit");
    setData(data);
    if (!selected && data.controls.length) setSelected(data.controls[0].id);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!selected) return;
    http.get(`/controls/${selected}`).then(r => setDetail(r.data));
  }, [selected]);

  const run = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const { data: r } = await http.post(`/controls/${selected}/run`);
      toast.success(`Run complete · ${r.exceptions} exceptions`);
      await load();
      const { data: det } = await http.get(`/controls/${selected}`);
      setDetail(det);
    } catch { toast.error("Run failed"); }
    setRunning(false);
  };

  if (!data) return <div className="p-8 font-mono text-xs uppercase tracking-wider text-[#737373]">Loading audit workspace…</div>;

  const controls = data.controls.filter(c =>
    (!filter.process || c.process === filter.process) &&
    (!filter.crit || c.criticality === filter.crit)
  );
  const processes = [...new Set(data.controls.map(c => c.process))];
  const criticalities = [...new Set(data.controls.map(c => c.criticality))];

  return (
    <PageShell maxWidth="max-w-[1800px]">
      <div data-testid="audit-workspace">
        <PageHeader
          kicker="INTERNAL AUDIT"
          title="Control library"
          subtitle="Browse controls, run tests, review exceptions, and capture evidence-ready documentation."
        />

        <InsightPanel section="audit" title="Audit Workspace · AI Insights" />

        <SectionCard
          kicker="FILTERS"
          title="Control selection"
          right={<span className="font-mono text-xs text-[#737373]">{controls.length} / {data.controls.length} controls</span>}
          className="mb-4"
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap gap-2 items-center">
            <select
              data-testid="filter-process"
              value={filter.process}
              onChange={(e) => setFilter(f => ({ ...f, process: e.target.value }))}
              className="bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 h-10 text-xs text-white font-mono uppercase tracking-wider focus:border-white outline-none rounded-xl"
            >
              <option value="">All processes</option>
              {processes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              data-testid="filter-criticality"
              value={filter.crit}
              onChange={(e) => setFilter(f => ({ ...f, crit: e.target.value }))}
              className="bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 h-10 text-xs text-white font-mono uppercase tracking-wider focus:border-white outline-none rounded-xl"
            >
              <option value="">All criticality</option>
              {criticalities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Control list */}
          <SectionCard className="lg:col-span-2" kicker="CONTROLS" title="Control list" bodyClassName="p-0" data-testid="control-list">
            <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="audit-control-list-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>Code</DataTableTh>
                  <DataTableTh>Control</DataTableTh>
                  <DataTableTh align="center">Last</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {controls.map(c => (
                  <DataTableRow
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    testId={`control-row-${c.code}`}
                    className={clsx(selected === c.id && "bg-[#0A0A0A]/55")}
                  >
                    <DataTableTd className="font-mono text-xs text-white">{c.code}</DataTableTd>
                    <DataTableTd>
                      <div className="text-sm text-white truncate max-w-xs">{c.name}</div>
                      <div className="font-mono text-[10px] text-[#737373] mt-0.5">{c.process} · {c.criticality}</div>
                    </DataTableTd>
                    <DataTableTd align="center">
                      {c.last_run_exceptions == null ? (
                        <span className="font-mono text-[10px] text-[#737373]">—</span>
                      ) : c.last_run_exceptions === 0 ? (
                        <CheckCircle size={14} weight="fill" className="mx-auto text-[#30D158]" />
                      ) : (
                        <span className="font-mono tabular-nums text-xs text-[#FF9F0A]">{c.last_run_exceptions}</span>
                      )}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </SectionCard>

          {/* Detail */}
          <SectionCard className="lg:col-span-3 min-h-[500px]" kicker="DETAIL" title="Control detail" data-testid="control-detail">
          {detail?.control ? (
            <>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">{detail.control.code} · {detail.control.framework}</div>
                  <h2 className="font-heading text-2xl text-white mt-1 tracking-tight">{detail.control.name}</h2>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mt-1">{detail.control.process} · {detail.control.criticality} · {detail.control.frequency}</div>
                </div>
                <button
                  data-testid="run-control-btn"
                  onClick={run}
                  disabled={running}
                  className="flex items-center gap-2 px-4 h-10 bg-white text-black font-mono text-xs uppercase tracking-wider hover:bg-[#E5E5E5] transition-colors disabled:opacity-50 rounded-full shadow-[0_18px_55px_rgba(255,255,255,0.08)]"
                >
                  <Play size={12} weight="fill" /> {running ? "Running..." : "Run now"}
                </button>
              </div>
              <p className="text-sm text-[#E5E5E5] leading-relaxed mb-6">{detail.control.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-4 rounded-xl">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Last run</div>
                  <div className="font-mono text-sm text-white mt-1">{fmtDateTime(detail.control.last_run_at)}</div>
                </div>
                <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-4 rounded-xl">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Status</div>
                  <div className="font-mono text-sm mt-1" style={{ color: detail.control.last_run_pass === true ? "#30D158" : detail.control.last_run_pass === false ? "#FF3B30" : "#737373" }}>
                    {detail.control.last_run_pass === true ? "PASS" : detail.control.last_run_pass === false ? "FAIL" : "—"}
                  </div>
                </div>
                <div className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-4 rounded-xl">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Exceptions</div>
                  <div className="font-mono tabular-nums text-2xl text-white mt-1">{detail.control.last_run_exceptions ?? "—"}</div>
                </div>
              </div>

              <h4 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-3">Recent runs</h4>
              <div className="space-y-1 mb-6">
                {detail.recent_runs.slice(0, 8).map(r => (
                  <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-[#1F1F1F] text-xs">
                    <span className="font-mono text-[#A3A3A3]">{fmtDateTime(r.run_ts)}</span>
                    <span className="font-mono text-[#737373]">{r.status}</span>
                    <span className={clsx("font-mono tabular-nums", r.exceptions_count > 0 ? "text-[#FF9F0A]" : "text-[#30D158]")}>{r.exceptions_count} exc</span>
                  </div>
                ))}
              </div>

              <h4 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-3">Open exceptions ({detail.open_exceptions.length})</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {detail.open_exceptions.map(e => (
                  <div key={e.id} onClick={() => window.location.href = `/app/evidence/${e.id}`} className="border border-[#262626] p-4 bg-[#0A0A0A]/55 backdrop-blur text-xs cursor-pointer hover:bg-[#1F1F1F]/55 transition-colors rounded-xl">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-white truncate">{e.title}</div>
                        <div className="font-mono text-[10px] text-[#737373] mt-0.5">{e.entity} · {e.source_record_id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Warning size={12} className={e.severity === "critical" ? "text-[#FF3B30]" : "text-[#FF9F0A]"} />
                        <span className="font-mono tabular-nums">{e.financial_exposure ? `$${(e.financial_exposure / 1000).toFixed(1)}K` : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[#737373] font-mono text-xs">Select a control to view details</div>
          )}
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
