import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { toast } from "sonner";
import { TreeStructure, ArrowsClockwise } from "@phosphor-icons/react";
import clsx from "clsx";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";

export default function EntityRollup() {
  const [data, setData] = useState(null);
  const [drill, setDrill] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [process, setProcess] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data: d } = await http.get("/rollups/hierarchy");
      const root = d?.root || d?.node || null;
      const normalized = root ? { ...d, root } : d;
      setData(normalized);
      if (root?.id && !nodeId) setNodeId(root.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load rollup hierarchy");
      setData(null);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const drillAt = async (nid, proc = null) => {
    setBusy(true);
    try {
      const q = proc ? { node_id: nid, process: proc } : { node_id: nid };
      const { data: d } = await http.get("/rollups/drilldown", { params: q });
      setDrill(d);
      setNodeId(nid);
      setProcess(proc);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Drilldown failed");
    }
    setBusy(false);
  };

  const recompute = async () => {
    setBusy(true);
    try {
      await http.post("/rollups/recompute");
      toast.success("Rollup snapshots refreshed");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Recompute failed");
    }
    setBusy(false);
  };

  if (!data?.root) {
    return <div className="p-8 font-mono text-xs text-[#737373]">Loading hierarchy…</div>;
  }

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div data-testid="entity-rollup">
        <PageHeader
          kicker="CONSOLIDATION"
          title="Entity rollups"
          icon={<TreeStructure size={18} />}
          subtitle={`Drill from organization → region → legal entity → process → cases. Reporting currency: ${data.reporting_ccy || "USD"}.`}
          right={
            <button
              type="button"
              onClick={recompute}
              disabled={busy}
              className="flex items-center gap-2 px-4 h-10 rounded-full border border-[#262626] bg-[#141414]/70 hover:bg-[#1F1F1F]/70 text-xs font-mono uppercase tracking-wider text-white disabled:opacity-40"
            >
              <ArrowsClockwise size={14} /> Recompute snapshots
            </button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard className="lg:col-span-1" kicker="HIERARCHY" title="Org structure" bodyClassName="p-4">
            <div className="space-y-2">
              {(data.children || []).map((row) => (
                <button
                  key={row.hierarchy.id}
                  type="button"
                  onClick={() => drillAt(row.hierarchy.id)}
                  className={clsx(
                    "w-full text-left px-3 py-3 text-xs font-mono border rounded-xl transition-colors",
                    nodeId === row.hierarchy.id
                      ? "border-white bg-[#0A0A0A]/55"
                      : "border-[#262626] hover:bg-[#0A0A0A]/40"
                  )}
                >
                  <div className="text-white">{row.hierarchy.name}</div>
                  <div className="text-[#737373]">{row.hierarchy.type} · readiness {row.metrics?.audit_readiness_pct}%</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="lg:col-span-2" kicker="ROLLUP" title="Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              {data.metrics && Object.entries(data.metrics).map(([k, v]) => (
                <div key={k} className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 rounded-xl">
                  <div className="text-[#737373]">{k.replace(/_/g, " ")}</div>
                  <div className="text-white text-lg mt-1">{typeof v === "number" ? v : String(v)}</div>
                </div>
              ))}
            </div>

            {drill && (
              <div className="mt-6 border-t border-[#262626]/70 pt-4">
                <div className="font-mono text-[10px] text-[#737373] uppercase mb-2">
                  Drill: {drill.drill} {drill.process ? `· ${drill.process}` : ""}
                </div>
              {drill.drill === "hierarchy" && (
                <div className="space-y-1">
                  {(drill.rows || []).map((row) => (
                    <button
                      key={row.hierarchy.id}
                      type="button"
                      onClick={() => drillAt(row.hierarchy.id)}
                      className="w-full text-left px-3 py-2.5 text-xs border border-[#262626] bg-[#0A0A0A]/35 hover:bg-[#0A0A0A]/55 rounded-xl transition-colors"
                    >
                      {row.hierarchy.name} · readiness {row.metrics?.audit_readiness_pct}%
                    </button>
                  ))}
                </div>
              )}
              {drill.drill === "process" && (
                <div className="space-y-1">
                  {(drill.rows || []).map((row) => (
                    <button
                      key={row.process}
                      type="button"
                      onClick={() => drillAt(drill.node.id, row.process)}
                      className="w-full text-left px-3 py-2.5 text-xs border border-[#262626] bg-[#0A0A0A]/35 hover:bg-[#0A0A0A]/55 rounded-xl transition-colors"
                    >
                      {row.process} · open cases {row.metrics?.open_cases}
                    </button>
                  ))}
                </div>
              )}
              {drill.drill === "case" && (
                <ul className="space-y-1 max-h-80 overflow-y-auto">
                  {(drill.cases || []).map((c) => (
                    <li key={c.id}>
                      <a href={`/app/cases/${c.id}`} className="text-[#0A84FF] text-xs font-mono hover:underline">
                        {c.title}
                      </a>
                      <span className="text-[#737373] ml-2">{c.severity} · {c.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
