import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { toast } from "sonner";
import { ShieldCheck, Gavel, Trash, Plus } from "@phosphor-icons/react";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";

export default function GovernanceConsole() {
  const [tab, setTab] = useState("retention");
  const [policies, setPolicies] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [holds, setHolds] = useState([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("case");
  const [reason, setReason] = useState("");

  const load = async () => {
    const [p, e, h] = await Promise.all([
      http.get("/retention/policies"),
      http.get("/retention/eligible"),
      http.get("/legal-holds", { params: { status: "active" } }),
    ]);
    setPolicies(p.data);
    setEligible(e.data);
    setHolds(h.data);
  };

  useEffect(() => { load(); }, []);

  const runRetention = async (dry) => {
    try {
      const { data } = await http.post("/retention/run", { dry_run: dry, artifact_types: null });
      toast.success(dry ? `Dry run: ${JSON.stringify(data.deleted)}` : `Purge complete: ${JSON.stringify(data.deleted)}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Retention run failed");
    }
  };

  const createHold = async () => {
    if (!name.trim() || !reason.trim()) return;
    try {
      await http.post("/legal-holds/", { name, scope, reason, entity_code: scope === "entity" ? "US-HQ" : null });
      toast.success("Legal hold created");
      setName(""); setReason("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Create failed");
    }
  };

  const releaseHold = async (id) => {
    if (!window.confirm("Release this hold?")) return;
    try {
      await http.post(`/legal-holds/${id}/release`, null, { params: { reason: "Released from console" } });
      toast.success("Hold released");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Release failed");
    }
  };

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <div data-testid="governance-console">
        <PageHeader
          kicker="GOVERNANCE"
          title="Retention & legal hold"
          icon={<ShieldCheck size={18} />}
          subtitle="Run retention (dry-run or limited live purge), and manage legal holds that block retention and protect evidence."
        />

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => setTab("retention")}
            className={`px-4 h-10 text-xs font-mono uppercase rounded-full transition-colors ${
              tab === "retention" ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
            }`}
          >
            Retention
          </button>
          <button
            type="button"
            onClick={() => setTab("holds")}
            className={`px-4 h-10 text-xs font-mono uppercase rounded-full transition-colors flex items-center gap-2 ${
              tab === "holds" ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
            }`}
          >
            <Gavel size={14} /> Legal holds
          </button>
        </div>

      {tab === "retention" && (
        <div className="mt-6 space-y-6">
          <SectionCard
            kicker="RETENTION"
            title="Run retention"
            right={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runRetention(true)}
                  className="px-4 h-10 rounded-full border border-[#262626] bg-[#141414]/70 hover:bg-[#1F1F1F]/70 text-xs font-mono uppercase text-white"
                >
                  Dry run
                </button>
                <button
                  type="button"
                  onClick={() => runRetention(false)}
                  className="px-4 h-10 rounded-full border border-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-xs font-mono uppercase text-[#FF3B30] flex items-center gap-2"
                >
                  <Trash size={14} /> Live purge (ingestion / copilot only)
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="font-mono text-[10px] text-[#737373] uppercase mb-2">Policies</div>
                <div className="border border-[#262626] divide-y divide-[#262626]/60 text-xs font-mono rounded-xl overflow-hidden bg-[#0A0A0A]/40">
                  {policies.map((p) => (
                    <div key={p.id} className="p-3 flex justify-between gap-4">
                      <span className="text-white">{p.name}</span>
                      <span className="text-[#737373]">{p.artifact_type} · {p.retention_days}d · {p.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-[#737373] uppercase mb-2">Eligible (estimate)</div>
                <pre className="p-3 bg-[#0A0A0A]/55 backdrop-blur border border-[#262626] text-[10px] text-[#A3A3A3] overflow-x-auto rounded-xl">{JSON.stringify(eligible, null, 2)}</pre>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "holds" && (
        <div className="mt-6 space-y-6">
          <SectionCard kicker="LEGAL HOLD" title="Create new hold">
            <div className="space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full bg-[#141414]/70 backdrop-blur border border-[#404040] px-3 h-10 text-xs text-white rounded-xl" />
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full bg-[#141414]/70 backdrop-blur border border-[#404040] px-3 h-10 text-xs text-white rounded-xl">
              <option value="case">case</option>
              <option value="evidence">evidence</option>
              <option value="entity">entity</option>
              <option value="global">global</option>
            </select>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="w-full bg-[#141414]/70 backdrop-blur border border-[#404040] px-3 h-10 text-xs text-white rounded-xl" />
              <button type="button" onClick={createHold} className="flex items-center gap-2 px-4 h-10 bg-white text-black text-xs font-mono uppercase rounded-full shadow-[0_18px_55px_rgba(255,255,255,0.08)]">
                <Plus size={14} /> Create
              </button>
            </div>
          </SectionCard>

          <SectionCard kicker="ACTIVE" title={`Active holds (${holds.length})`} bodyClassName="p-0">
            <div className="divide-y divide-[#262626]/60 text-xs font-mono">
              {holds.map((h) => (
                <div key={h.id} className="p-4 flex justify-between items-center gap-4">
                  <div>
                    <div className="text-white">{h.name}</div>
                    <div className="text-[#737373]">{h.scope} · {h.id}</div>
                  </div>
                  <button type="button" onClick={() => releaseHold(h.id)} className="px-4 h-10 rounded-full border border-[#FF9F0A] text-[#FF9F0A] uppercase text-[10px] hover:bg-[#FF9F0A]/10 transition-colors">
                    Release
                  </button>
                </div>
              ))}
              {!holds.length && <div className="p-4 text-[#737373]">No active holds.</div>}
            </div>
          </SectionCard>
        </div>
      )}
      </div>
    </PageShell>
  );
}
