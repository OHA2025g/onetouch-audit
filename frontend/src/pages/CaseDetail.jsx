import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { http } from "../lib/api";
import { SeverityBadge, StatusBadge, PriorityTag } from "../components/Badges";
import { fmtUSD, fmtDate, fmtDateTime } from "../lib/format";
import { toast } from "sonner";
import { CaretLeft, Graph, PaperPlaneRight, CheckCircle, User } from "@phosphor-icons/react";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";

const STATUSES = ["open", "in_progress", "closed"];
const ROOT_CAUSES = ["Process gap", "System config", "Human error", "Policy not followed", "Data quality", "Approval override"];

export default function CaseDetail() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await http.get(`/cases/${caseId}`);
    setD(data);
  };
  useEffect(() => { load(); }, [caseId]); // eslint-disable-line

  const updateCase = async (patch) => {
    setSaving(true);
    try {
      await http.patch(`/cases/${caseId}`, patch);
      toast.success("Case updated");
      await load();
    } catch { toast.error("Update failed"); }
    setSaving(false);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await http.post(`/cases/${caseId}/comments`, { comment });
      setComment("");
      await load();
    } catch { toast.error("Comment failed"); }
  };

  if (!d) return <div className="p-8 font-mono text-xs uppercase text-[#737373]">Loading case…</div>;

  const c = d.case;
  const ex = d.exception;

  return (
    <PageShell maxWidth="max-w-[1600px]">
      <div data-testid="case-detail">
        <button onClick={() => nav("/app/cases")} className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-white transition-colors mb-4" data-testid="back-to-cases">
          <CaretLeft size={12} /> Back to cases
        </button>

        <PageHeader
          kicker={`${c.control_code} · Case ${c.id.slice(0, 8)}`}
          title={c.title}
          subtitle={`${c.entity} · ${c.process}`}
          right={
            <Link
              to={`/app/evidence/${c.exception_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#141414]/70 backdrop-blur border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F]/70 transition-colors rounded-full wow-badge"
              data-testid="view-evidence-btn"
            >
              <Graph size={12} /> Evidence graph
            </Link>
          }
        />

        <div className="flex flex-wrap items-center gap-3 mt-3 mb-6">
          <SeverityBadge severity={c.severity} size="md" />
          <StatusBadge status={c.status} />
          <PriorityTag priority={c.priority} />
          {d.governance?.worm && (
            <span className="wow-badge font-mono text-[10px] uppercase px-3 py-2 text-[#FF9F0A]">WORM locked</span>
          )}
          {d.governance?.legal_hold && (
            <span className="wow-badge font-mono text-[10px] uppercase px-3 py-2 text-[#0A84FF]">Legal hold</span>
          )}
        </div>
        {(d.governance?.worm || d.governance?.legal_hold) && (
          <p className="text-xs text-[#A3A3A3] mb-6 max-w-3xl">
            {d.governance.worm && "Closed cases are immutable unless a permitted role uses API override (?force_override=true). "}
            {d.governance.legal_hold && "This record is under legal hold — retention purge is blocked."}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Main */}
          <SectionCard className="lg:col-span-2" kicker="CASE" title="Summary & activity">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-3">Summary</h3>
            <p className="text-sm text-[#E5E5E5] leading-relaxed mb-6">{c.summary}</p>

          {ex && (
            <div
              onClick={() => nav(`/app/drill/${ex.source_record_type === "access_event" ? "user" : ex.source_record_type}/${ex.source_record_type === "access_event" ? ex.source_record_id : ex.source_record_id}`)}
              className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-4 mb-6 cursor-pointer hover:bg-[#1F1F1F]/55 transition-colors rounded-xl"
              data-testid="source-record-drill"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-2">Source record · click to drill</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-[#0A84FF]">{ex.source_record_type} · {ex.source_record_id} →</span>
                <span className="font-mono text-xs text-[#A3A3A3]">anomaly={ex.anomaly_score} · materiality={ex.materiality_score}</span>
              </div>
            </div>
          )}

          <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-3">Activity</h3>
          <div className="space-y-3 mb-6">
            {d.history.map(h => (
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <div className="w-1 h-1 bg-[#0A84FF] mt-1.5" />
                <div>
                  <span className="text-white">Status → <span className="font-mono">{h.new_status}</span></span>
                  <span className="text-[#737373] ml-2 font-mono">{fmtDateTime(h.changed_at)} · {h.changed_by_user_email}</span>
                </div>
              </div>
            ))}
            {d.comments.map(cm => (
              <div key={cm.id} className="border-l border-[#262626] pl-3 py-1">
                <div className="flex items-center gap-2 text-xs">
                  <User size={10} className="text-[#737373]" />
                  <span className="text-white">{cm.user_name}</span>
                  <span className="text-[#737373] font-mono">{fmtDateTime(cm.created_at)}</span>
                </div>
                <div className="text-sm text-[#E5E5E5] mt-1">{cm.comment}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              data-testid="case-comment-input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add investigation note or closure evidence..."
              rows={2}
              className="flex-1 bg-[#0A0A0A]/55 backdrop-blur border border-[#262626] px-3 py-2 text-sm text-white focus:border-white outline-none resize-none rounded-xl"
            />
            <button
              data-testid="submit-comment-btn"
              onClick={addComment}
              className="px-4 self-stretch bg-white text-black font-mono text-xs uppercase tracking-wider hover:bg-[#E5E5E5] transition-colors rounded-xl shadow-[0_18px_55px_rgba(255,255,255,0.08)]"
            >
              <PaperPlaneRight size={14} />
            </button>
          </div>
          </SectionCard>

          {/* Right: Actions */}
          <SectionCard kicker="ACTIONS" title="Case actions" data-testid="case-actions">

            <div className="space-y-4">
              <KVField label="Owner" value={c.owner_name || c.owner_email} />
              <KVField label="Exposure" value={fmtUSD(c.financial_exposure)} mono />
              <KVField label="Detected" value={fmtDate(c.detected_at)} mono />
              <KVField label="Due" value={fmtDate(c.due_date)} mono />
              <KVField label="Opened" value={fmtDate(c.opened_at)} mono />
              {c.closed_at && <KVField label="Closed" value={fmtDate(c.closed_at)} mono />}
            </div>

            <div className="mt-6 border-t border-[#262626]/70 pt-6 space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-2">Change status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      data-testid={`status-btn-${s}`}
                      disabled={saving || c.status === s}
                      onClick={() => updateCase({ status: s })}
                      className={`px-4 h-10 text-xs font-mono uppercase tracking-wider transition-colors rounded-full ${
                        c.status === s ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
                      }`}
                    >{s === "in_progress" ? "In progress" : s}</button>
                  ))}
                </div>
              </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-2">Root cause</div>
              <select
                data-testid="root-cause-select"
                value={c.root_cause_category || ""}
                onChange={(e) => updateCase({ root_cause_category: e.target.value })}
                className="w-full bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 h-10 text-sm text-white outline-none focus:border-white rounded-xl"
              >
                <option value="">— select —</option>
                {ROOT_CAUSES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {c.status !== "closed" && (
              <button
                data-testid="close-case-btn"
                onClick={() => updateCase({ status: "closed" })}
                className="w-full flex items-center justify-center gap-2 bg-[#30D158] text-black font-mono text-xs uppercase tracking-wider py-3 hover:bg-[#65E08C] transition-colors rounded-full shadow-[0_18px_45px_rgba(34,197,94,0.18)]"
              >
                <CheckCircle size={14} weight="fill" /> Close & retest
              </button>
            )}
          </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

const KVField = ({ label, value, mono }) => (
  <div className="flex justify-between items-baseline">
    <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">{label}</span>
    <span className={`text-sm text-white ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
  </div>
);
