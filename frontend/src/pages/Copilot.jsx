import React, { useEffect, useRef, useState } from "react";
import { http } from "../lib/api";
import { toast } from "sonner";
import { PaperPlaneRight, Sparkle, Warning, CheckCircle } from "@phosphor-icons/react";
import clsx from "clsx";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";

const SUGGESTED = [
  "Why did audit readiness decline this week?",
  "Which three issues most threaten close?",
  "Summarize the top duplicate-payment exposures.",
  "Show open SoD conflicts by entity.",
  "Draft an audit committee note on our AP controls.",
];

export default function Copilot() {
  const [sessions, setSessions] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const boxRef = useRef(null);

  const loadSessions = async () => {
    const { data } = await http.get("/copilot/sessions");
    setSessions(data);
  };
  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [sessions]);

  const ask = async (q) => {
    const question_text = (q || question).trim();
    if (!question_text) return;
    setAsking(true);
    setQuestion("");
    // Optimistic insert
    const tempId = `tmp-${Date.now()}`;
    setSessions(s => [{ id: tempId, question: question_text, answer: "", citations: [], confidence: 0, needs_human_review: false, model: "gemini/...", created_at: new Date().toISOString(), pending: true }, ...s]);
    try {
      const { data } = await http.post("/copilot/ask", { question: question_text, session_id: sessionId });
      setSessionId(data.session_id);
      setSessions(s => s.filter(x => x.id !== tempId));
      await loadSessions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Copilot failed");
      setSessions(s => s.filter(x => x.id !== tempId));
    }
    setAsking(false);
  };

  return (
    <div className="h-full flex flex-col" data-testid="copilot-page">
      <div className="border-b border-[#262626]/70 bg-[#0A0A0A]/40 backdrop-blur-xl">
        <PageShell maxWidth="max-w-[1800px]">
          <PageHeader
            kicker="AI COPILOT · GOVERNED"
            title="Audit copilot"
            icon={<Sparkle size={18} weight="fill" className="text-[#0A84FF]" />}
            subtitle={
              <>
                RAG over controls, findings, evidence, and policies ·{" "}
                <span className="font-mono text-[#0A84FF]">gemini/gemini-3-flash-preview</span>
              </>
            }
          />
        </PageShell>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div ref={boxRef} className="flex-1 overflow-y-auto beam-border relative">
          <PageShell maxWidth="max-w-[1800px]">
          {sessions.length === 0 && (
            <div className="max-w-2xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-4">Suggested prompts</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    data-testid={`suggested-${i}`}
                    onClick={() => ask(s)}
                    className="text-left p-4 bg-[#0A0A0A]/55 backdrop-blur border border-[#262626] hover:bg-[#1F1F1F]/55 hover:border-[#404040] transition-colors rounded-xl"
                  >
                    <div className="text-sm text-white">{s}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-6 max-w-4xl">
            {sessions.map(s => <Message key={s.id} s={s} />)}
          </div>
          </PageShell>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#262626]/70 bg-[#0A0A0A]/55 backdrop-blur-xl" data-testid="copilot-input-area">
        <PageShell maxWidth="max-w-[1800px]">
          <SectionCard kicker="PROMPT" title="Ask a question" bodyClassName="p-4">
            <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2 max-w-4xl">
              <input
                data-testid="copilot-question"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about controls, exposure, cases, policies…"
                className="flex-1 bg-[#141414]/70 backdrop-blur border border-[#262626] px-4 h-11 text-sm text-white outline-none focus:border-white font-body rounded-xl"
              />
              <button
                data-testid="copilot-submit-btn"
                type="submit"
                disabled={asking || !question.trim()}
                className="flex items-center gap-2 px-6 h-11 bg-white text-black font-mono text-xs uppercase tracking-wider hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors rounded-full shadow-[0_18px_55px_rgba(255,255,255,0.10)]"
              >
                {asking ? "Thinking..." : <>Ask <PaperPlaneRight size={12} /></>}
              </button>
            </form>
            <div className="max-w-4xl mt-2 font-mono text-[10px] uppercase tracking-wider text-[#525252]">
              All prompts and responses are logged · material conclusions require human review
            </div>
          </SectionCard>
        </PageShell>
      </div>
    </div>
  );
}

function Message({ s }) {
  return (
    <div className="fade-up">
      {/* user question */}
      <div className="flex gap-3 mb-3">
        <div className="w-6 h-6 bg-white flex-shrink-0 flex items-center justify-center font-mono text-xs text-black">Q</div>
        <div className="flex-1">
          <div className="text-sm text-white">{s.question}</div>
          <div className="font-mono text-[10px] text-[#737373] mt-1">{new Date(s.created_at).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* answer */}
      <div className="flex gap-3 ml-4 border-l border-[#262626] pl-4">
        <div className="w-6 h-6 bg-[#0A84FF] flex-shrink-0 flex items-center justify-center font-mono text-xs text-white">
          <Sparkle size={10} weight="fill" />
        </div>
        <div className="flex-1">
          {s.pending ? (
            <div className="font-mono text-xs text-[#737373] italic">analyzing context…</div>
          ) : (
            <>
              <div className="text-sm text-[#E5E5E5] leading-relaxed whitespace-pre-wrap">{s.answer}</div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <ConfidenceBadge value={s.confidence} />
                {s.needs_human_review && (
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#FF9F0A]">
                    <Warning size={12} /> Human review required
                  </span>
                )}
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#525252]">{s.model}</span>
              </div>
              {s.citations && s.citations.length > 0 && (
                <div className="mt-3 border border-[#262626] bg-[#0A0A0A] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#737373] mb-2">Sources ({s.citations.length})</div>
                  <div className="space-y-1">
                    {s.citations.slice(0, 8).map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-mono text-[#0A84FF] w-6 flex-shrink-0">[#{i + 1}]</span>
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">{c.source_type}</div>
                          <div className="text-[#E5E5E5] truncate">{c.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? "#30D158" : pct >= 60 ? "#FF9F0A" : "#FF3B30";
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
      <CheckCircle size={12} /> confidence {pct}%
    </span>
  );
}
