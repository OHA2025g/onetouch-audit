import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lightning, ShieldCheck, Eye, EyeSlash } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { roleToPath } from "../App";

const PERSONAS = [
  { role: "CFO", email: "cfo@onetouch.ai", detail: "Marion Acheson · US HQ" },
  { role: "Controller", email: "controller@onetouch.ai", detail: "Derek Whitmore" },
  { role: "Internal Auditor", email: "auditor@onetouch.ai", detail: "Priya Rangan" },
  { role: "Compliance", email: "compliance@onetouch.ai", detail: "Tomás Leiva" },
  { role: "Process Owner", email: "owner@onetouch.ai", detail: "Sana Kibet" },
  { role: "External Auditor", email: "external.auditor@bigfour.example", detail: "Hannah Oduya · BigFour" },
];

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("cfo@onetouch.ai");
  const [password, setPassword] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome, ${user.full_name}`);
      nav(roleToPath(user.role));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (persona) => {
    setEmail(persona.email);
    setPassword("demo1234");
    setLoading(true);
    try {
      const user = await login(persona.email, "demo1234");
      toast.success(`Welcome, ${user.full_name}`);
      nav(roleToPath(user.role));
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex wow-bg" data-testid="login-page">
      {/* Left — Hero */}
      <div className="hidden lg:flex w-1/2 flex-col p-10 border-r border-[#262626] relative overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-15" />
        <div className="relative z-10 flex items-center gap-2 mb-20">
          <div className="w-8 h-8 bg-white flex items-center justify-center shadow-[0_16px_40px_rgba(255,255,255,0.12)]">
            <Lightning size={16} weight="fill" color="#000" />
          </div>
          <div className="leading-none">
            <div className="font-heading text-lg text-white tracking-tight">OneTouch Audit AI</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373]">Finance Control Command Center</div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#737373] mb-6">
            — v1.0 · continuous assurance
          </div>
          <h1 className="font-heading text-5xl font-medium text-white leading-[1.05] tracking-tight">
            Know if you are<br />audit-ready.
            <br /><span className="text-[#737373]">In one touch.</span>
          </h1>
          <p className="text-[#A3A3A3] mt-8 text-base max-w-md leading-relaxed">
            Continuous controls monitoring across the full transaction population. Evidence-backed, explainable AI — governed for CFO-grade assurance.
          </p>
          <div className="grid grid-cols-3 gap-px bg-[#262626] border border-[#262626] mt-12 max-w-md rounded-2xl overflow-hidden">
            {[
              { k: "Controls monitored", v: "12 / 12" },
              { k: "Full-pop coverage", v: "100%" },
              { k: "Entities", v: "4" },
            ].map((s, i) => (
              <div key={i} className="bg-[#0A0A0A]/70 backdrop-blur p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#737373]">{s.k}</div>
                <div className="font-mono tabular-nums text-xl text-white mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 font-mono text-[10px] uppercase tracking-[0.15em] text-[#525252]">
          Aligned with IIA Continuous Auditing · Deloitte CCM · NIST AI RMF
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <ShieldCheck size={28} className="text-white" weight="light" />
            <h2 className="font-heading text-3xl text-white mt-4 tracking-tight">Sign in</h2>
            <p className="text-[#737373] font-mono text-xs uppercase tracking-[0.12em] mt-2">
              Authenticated access — audit logged
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] block mb-2">Email</label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors rounded-xl"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] block mb-2">Password</label>
              <div className="relative">
                <input
                  data-testid="login-password-input"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#141414]/70 backdrop-blur border border-[#262626] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors pr-10 rounded-xl"
                />
                <button
                  type="button"
                  data-testid="toggle-password-btn"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white"
                >{show ? <EyeSlash size={14} /> : <Eye size={14} />}</button>
              </div>
            </div>
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-mono text-sm uppercase tracking-[0.15em] py-3 hover:bg-[#E5E5E5] transition-colors disabled:opacity-50 rounded-full shadow-[0_22px_70px_rgba(255,255,255,0.12)]"
            >
              {loading ? "Authenticating..." : "Sign in →"}
            </button>
          </form>

          <div className="mt-10 border-t border-[#262626] pt-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#737373] mb-3">Quick persona access · demo</div>
            <div className="space-y-1">
              {PERSONAS.map((p) => (
                <button
                  key={p.email}
                  data-testid={`quick-persona-${p.role.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => quickLogin(p)}
                  className="w-full flex justify-between items-center text-left px-3 py-2 bg-[#141414]/70 backdrop-blur border border-[#262626] hover:bg-[#1F1F1F]/70 hover:border-[#404040] transition-colors rounded-xl"
                >
                  <div>
                    <div className="text-sm text-white">{p.role}</div>
                    <div className="font-mono text-[10px] text-[#737373]">{p.detail}</div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">demo1234 →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
