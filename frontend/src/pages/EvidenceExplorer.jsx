import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../lib/api";
import { SeverityBadge } from "../components/Badges";
import { fmtUSD, fmtDate } from "../lib/format";
import { MagnifyingGlass, Graph as GraphIcon, Table as TableIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import InsightPanel from "../components/InsightPanel";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

const NODE_COLORS = {
  exception: "#FF3B30",
  control: "#0A84FF",
  transaction: "#FFFFFF",
  policy: "#FF9F0A",
  case: "#30D158",
  user: "#A3A3A3",
  test: "#A3A3A3",
};

export default function EvidenceExplorer() {
  const { exceptionId } = useParams();
  const nav = useNavigate();
  const [exceptions, setExceptions] = useState([]);
  const [query, setQuery] = useState("");
  const [graph, setGraph] = useState(null);
  const [view, setView] = useState("graph");

  useEffect(() => {
    http.get("/exceptions?limit=200").then(r => {
      setExceptions(r.data);
      if (!exceptionId && r.data.length) nav(`/app/evidence/${r.data[0].id}`, { replace: true });
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!exceptionId) return;
    http.get(`/evidence/${exceptionId}`).then(r => setGraph(r.data));
  }, [exceptionId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return exceptions.filter(e =>
      !q || e.title.toLowerCase().includes(q) || e.control_code.toLowerCase().includes(q) || e.entity.toLowerCase().includes(q)
    );
  }, [exceptions, query]);

  return (
    <PageShell maxWidth="max-w-[1800px]">
      <div data-testid="evidence-explorer">
        <PageHeader
          kicker="INVESTIGATION"
          title="Evidence explorer"
          subtitle="Follow the record chain behind exceptions, drill into transactions and access events, and export defensible evidence."
        />

        <InsightPanel section="evidence" title="Evidence · AI Insights" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[600px]">
          {/* Left: Exception picker */}
          <SectionCard className="lg:col-span-1" kicker="EXCEPTIONS" title="Pick an exception" bodyClassName="p-0">
            <div className="p-4 border-b border-[#262626]/70">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                <input
                  data-testid="evidence-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search exceptions…"
                  className="w-full bg-[#141414]/70 backdrop-blur border border-[#262626] pl-9 pr-3 h-10 text-sm text-white outline-none focus:border-white rounded-xl"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[640px] divide-y divide-[#262626]/60">
              {filtered.slice(0, 50).map(e => (
                <button
                  key={e.id}
                  onClick={() => nav(`/app/evidence/${e.id}`)}
                  data-testid={`evidence-pick-${e.id}`}
                  className={clsx(
                    "w-full text-left p-4 transition-colors",
                    exceptionId === e.id ? "bg-[#0A0A0A]/55" : "hover:bg-[#0A0A0A]/40"
                  )}
                >
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{e.title}</div>
                      <div className="font-mono text-[10px] text-[#737373] mt-0.5">{e.control_code} · {e.entity}</div>
                    </div>
                    <SeverityBadge severity={e.severity} />
                  </div>
                  <div className="mt-1 font-mono text-[10px] tabular-nums text-[#A3A3A3]">{fmtUSD(e.financial_exposure)}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Right: Graph view */}
          <SectionCard
            className="lg:col-span-3 flex flex-col"
            kicker="EVIDENCE"
            title="Graph & table"
            right={
              <div className="flex gap-2">
                <button
                  onClick={() => setView("graph")}
                  data-testid="view-graph-btn"
                  className={clsx(
                    "flex items-center gap-1 px-4 h-10 text-xs font-mono uppercase rounded-full transition-colors",
                    view === "graph" ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
                  )}
                >
                  <GraphIcon size={12} /> Graph
                </button>
                <button
                  onClick={() => setView("table")}
                  data-testid="view-table-btn"
                  className={clsx(
                    "flex items-center gap-1 px-4 h-10 text-xs font-mono uppercase rounded-full transition-colors",
                    view === "table" ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
                  )}
                >
                  <TableIcon size={12} /> Table
                </button>
              </div>
            }
            bodyClassName="p-0"
          >
            <div className="px-5 py-3 border-b border-[#262626]/70 flex items-center justify-between">
              <div className="text-sm text-white">
                {graph ? `${graph.nodes.length} nodes · ${graph.edges.length} edges` : "—"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">
                {exceptionId ? `exception: ${exceptionId.slice(0, 10)}…` : "select an exception"}
              </div>
            </div>
            <div className="p-6 relative overflow-auto">
              {graph?.governance && (graph.governance.worm || graph.governance.legal_hold) && (
                <div className="mb-4 flex flex-wrap gap-2 text-xs font-mono">
                  {graph.governance.worm && (
                    <span className="wow-badge px-3 py-2 text-[#FF9F0A] uppercase">WORM / finalized evidence</span>
                  )}
                  {graph.governance.legal_hold && (
                    <span className="wow-badge px-3 py-2 text-[#0A84FF] uppercase">Legal hold</span>
                  )}
                </div>
              )}
              {graph && (view === "graph" ? <GraphView graph={graph} /> : <TableView graph={graph} />)}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

function GraphView({ graph }) {
  const nav = useNavigate();
  // Radial layout: exception in middle, others around
  const nodes = graph.nodes;
  const centerNode = nodes.find(n => n.type === "exception") || nodes[0];
  const others = nodes.filter(n => n.id !== centerNode.id);
  const W = 800, H = 520, cx = W / 2, cy = H / 2;
  const positions = { [centerNode.id]: { x: cx, y: cy } };
  others.forEach((n, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2;
    const r = 200;
    positions[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const drillPath = (n) => {
    if (n.type === "transaction") {
      // Guess type from meta: invoice/payment/journal
      const id = n.id;
      if (id.startsWith("INV-")) return `/app/drill/invoice/${id}`;
      if (id.startsWith("PAY-")) return `/app/drill/payment/${id}`;
      if (id.startsWith("JE-")) return `/app/drill/journal/${id}`;
      if (id.startsWith("PO-") || id.startsWith("GRN-")) return null;
    }
    if (n.type === "control") return `/app/drill/control/${n.id}`;
    if (n.type === "case") return `/app/cases/${n.id}`;
    if (n.type === "user") {
      const em = n.id.startsWith("user::") ? n.id.slice(6) : n.id;
      return `/app/drill/user/${em}`;
    }
    return null;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-5xl mx-auto" data-testid="evidence-svg">
      {/* Edges */}
      {graph.edges.map((e, i) => {
        const a = positions[e.source], b = positions[e.target];
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#404040" strokeWidth="1" />
            <text x={mx} y={my - 4} fill="#737373" fontSize="9" fontFamily="IBM Plex Mono" textAnchor="middle">{e.relation}</text>
          </g>
        );
      })}
      {/* Nodes */}
      {nodes.map(n => {
        const p = positions[n.id];
        const color = NODE_COLORS[n.type] || "#FFFFFF";
        const path = drillPath(n);
        return (
          <g key={n.id} transform={`translate(${p.x}, ${p.y})`}
             style={{ cursor: path ? "pointer" : "default" }}
             onClick={() => path && nav(path)}
             data-testid={`graph-node-${n.type}-${n.id.slice(0, 12)}`}>
            <rect x="-80" y="-24" width="160" height="48" fill="#0A0A0A" stroke={color} strokeWidth="1" />
            <text x="0" y="-6" fill="#737373" fontSize="9" fontFamily="IBM Plex Mono" textAnchor="middle" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>{n.type}</text>
            <text x="0" y="10" fill="#FFFFFF" fontSize="11" fontFamily="IBM Plex Sans" textAnchor="middle">{truncate(n.label, 22)}</text>
          </g>
        );
      })}
    </svg>
  );
}

const truncate = (s, n) => s && s.length > n ? s.slice(0, n - 1) + "…" : s;

function TableView({ graph }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-2">Nodes ({graph.nodes.length})</h4>
        <DataTable maxHeightClassName="max-h-[45vh]" testId="evidence-graph-nodes-table">
          <DataTableHead>
            <tr>
              <DataTableTh>Type</DataTableTh>
              <DataTableTh>Label</DataTableTh>
              <DataTableTh>Subtitle</DataTableTh>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {graph.nodes.map(n => (
              <DataTableRow key={n.id}>
                <DataTableTd className="font-mono text-xs uppercase" style={{ color: NODE_COLORS[n.type] }}>{n.type}</DataTableTd>
                <DataTableTd className="text-white">{n.label}</DataTableTd>
                <DataTableTd className="text-[#A3A3A3] text-xs">{n.subtitle || "—"}</DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
      <div>
        <h4 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-2">Edges ({graph.edges.length})</h4>
        <DataTable maxHeightClassName="max-h-[45vh]" testId="evidence-graph-edges-table">
          <DataTableHead>
            <tr>
              <DataTableTh>Source</DataTableTh>
              <DataTableTh>Relation</DataTableTh>
              <DataTableTh>Target</DataTableTh>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {graph.edges.map((e, i) => (
              <DataTableRow key={i}>
                <DataTableTd className="font-mono text-xs text-white">{e.source.slice(0, 12)}</DataTableTd>
                <DataTableTd className="font-mono text-xs text-[#0A84FF]">{e.relation}</DataTableTd>
                <DataTableTd className="font-mono text-xs text-white">{e.target.slice(0, 12)}</DataTableTd>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </div>
  );
}
