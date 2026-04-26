import React, { useEffect, useState } from "react";
import { http } from "../lib/api";
import { toast } from "sonner";
import { fmtDateTime } from "../lib/format";
import { Database, Cpu, ShieldCheck, ArrowsClockwise, Bell, Plus, Trash, Sparkle } from "@phosphor-icons/react";
import { PageHeader, PageShell, SectionCard } from "../components/PageShell";
import { DataTable, DataTableBody, DataTableHead, DataTableRow, DataTableTd, DataTableTh } from "../components/DataTable";

export default function AdminConsole() {
  const [tab, setTab] = useState("models");
  const [models, setModels] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [runs, setRuns] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [notifSettings, setNotifSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [newWebhook, setNewWebhook] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [indexStatus, setIndexStatus] = useState(null);
  const [recalibrating, setRecalibrating] = useState(false);

  const [modelVersions, setModelVersions] = useState([]);
  const [training, setTraining] = useState(false);

  const load = async () => {
    const [m, p, l, s, r, ns, n, ix, mv] = await Promise.all([
      http.get("/admin/models"),
      http.get("/admin/prompts"),
      http.get("/admin/audit-logs"),
      http.get("/admin/summary"),
      http.get("/admin/ingestion-runs"),
      http.get("/notifications/settings"),
      http.get("/notifications"),
      http.get("/copilot/index-status"),
      http.get("/admin/model-versions"),
    ]);
    setModels(m.data); setPrompts(p.data); setLogs(l.data); setSummary(s.data); setRuns(r.data);
    setNotifSettings(ns.data); setNotifications(n.data); setIndexStatus(ix.data); setModelVersions(mv.data);
  };
  useEffect(() => { load(); }, []);

  const reseed = async () => {
    if (!window.confirm("Wipe all data and reseed?")) return;
    setResetting(true);
    try {
      await http.post("/admin/seed-reset");
      toast.success("Database reseeded + all controls re-run");
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Reset failed"); }
    setResetting(false);
  };

  const saveNotifSettings = async (patch) => {
    const { data } = await http.patch("/notifications/settings", patch);
    setNotifSettings(data);
    toast.success("Notification settings saved");
  };

  const addWebhook = async () => {
    const url = newWebhook.trim();
    if (!url) return;
    const next = [...(notifSettings?.webhook_urls || []), url];
    await saveNotifSettings({ webhook_urls: next });
    setNewWebhook("");
  };
  const removeWebhook = async (url) => {
    await saveNotifSettings({ webhook_urls: notifSettings.webhook_urls.filter(u => u !== url) });
  };
  const addEmail = async () => {
    const email = newEmail.trim();
    if (!email) return;
    const next = [...(notifSettings?.email_recipients || []), email];
    await saveNotifSettings({ email_recipients: next });
    setNewEmail("");
  };
  const removeEmail = async (email) => {
    await saveNotifSettings({ email_recipients: notifSettings.email_recipients.filter(e => e !== email) });
  };
  const scanNow = async () => {
    const { data } = await http.post("/notifications/scan-sla");
    toast.message(`SLA scan: ${data.notified} notified / ${data.scanned} scanned`);
    await load();
  };
  const recalibrate = async () => {
    setRecalibrating(true);
    try {
      const { data } = await http.post("/anomaly/recalibrate");
      toast.success(`Recalibrated ${data.exceptions_recalibrated} exceptions`);
    } catch { toast.error("Recalibration failed"); }
    setRecalibrating(false);
  };
  const rebuildIndex = async () => {
    try {
      const { data } = await http.post("/copilot/rebuild-index");
      toast.success(`Vector index rebuilt · ${data.indexed_docs} docs`);
      await load();
    } catch { toast.error("Rebuild failed"); }
  };

  const trainModel = async () => {
    setTraining(true);
    try {
      const { data } = await http.post("/anomaly/train", { notes: "admin-ui trigger" });
      toast.success(`Trained ${data.version_label} · ${data.metrics.n_train} samples · anomaly rate ${(data.metrics.test_anomaly_rate * 100).toFixed(1)}%`);
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Training failed"); }
    setTraining(false);
  };

  const approveVersion = async (id) => {
    try {
      await http.post(`/admin/model-versions/${id}/approve`);
      toast.success("Version approved and activated");
      await load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Approval failed"); }
  };

  const sendBriefNow = async () => {
    try {
      const { data } = await http.post("/notifications/daily-brief/send");
      if (data.skipped) toast.warning(`Skipped: ${data.skipped}`);
      else toast.success(`Daily brief dispatched · ${(data.dispatched_to || []).length} webhook(s)`);
      await load();
    } catch { toast.error("Brief dispatch failed"); }
  };

  return (
    <PageShell maxWidth="max-w-[1700px]">
      <div data-testid="admin-console">
        <PageHeader
          kicker="GOVERNANCE"
          title="Admin console"
          subtitle="Manage model registry, prompt governance, notifications, AI ops, audit logs, and ingestion runs."
          right={
            <button
              data-testid="reseed-btn"
              onClick={reseed}
              disabled={resetting}
              className="flex items-center gap-2 px-5 h-11 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/40 text-xs font-mono uppercase tracking-wider text-[#FF3B30] hover:bg-[#FF3B30]/15 transition-colors disabled:opacity-50"
            >
              <ArrowsClockwise size={12} className={resetting ? "animate-spin" : ""} /> Reseed database
            </button>
          }
        />

      {summary && (
        <SectionCard kicker="SYSTEM" title="Collections" className="mb-6" bodyClassName="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-3" data-testid="collection-summary">
            {Object.entries(summary.collections).map(([k, v]) => (
              <div key={k} className="border border-[#262626] bg-[#0A0A0A]/55 backdrop-blur p-3 rounded-xl">
                <div className="font-mono text-[9px] uppercase tracking-wider text-[#737373] truncate">{k}</div>
                <div className="font-mono tabular-nums text-lg text-white mt-1">{v}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 w-fit">
        {[
          { k: "models", label: "Model registry", icon: Cpu },
          { k: "prompts", label: "Prompt governance", icon: ShieldCheck },
          { k: "notifications", label: "Notifications", icon: Bell },
          { k: "ai-ops", label: "AI Ops", icon: Sparkle },
          { k: "logs", label: "Audit logs", icon: Database },
          { k: "ingest", label: "Ingestion runs", icon: Database },
        ].map(t => (
          <button
            key={t.k}
            data-testid={`admin-tab-${t.k}`}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-2 px-5 h-11 text-xs font-mono uppercase tracking-wider transition-colors rounded-full ${
              tab === t.k ? "bg-white text-black" : "bg-[#141414]/70 text-[#A3A3A3] hover:bg-[#1F1F1F]/70 border border-[#262626]"
            }`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Model registry */}
      {tab === "models" && (
        <SectionCard kicker="REGISTRY" title="Model registry" bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="admin-models-table">
            <DataTableHead>
              <tr>
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>Model</DataTableTh>
                <DataTableTh>Use case</DataTableTh>
                <DataTableTh>Tier</DataTableTh>
                <DataTableTh>Approved by</DataTableTh>
                <DataTableTh>Status</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {models.map(m => (
                <DataTableRow key={m.id} testId={`model-row-${m.id}`}>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{m.id}</DataTableTd>
                  <DataTableTd className="text-sm text-white font-mono">{m.provider}/{m.model_name}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{m.use_case}</DataTableTd>
                  <DataTableTd className="font-mono text-xs uppercase">{m.governance_tier}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3]">{m.approved_by}</DataTableTd>
                  <DataTableTd><span className="font-mono text-[10px] uppercase tracking-wider text-[#30D158] bg-[#30D158]/10 px-2 py-0.5">{m.approval_status}</span></DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      )}

      {tab === "prompts" && (
        <SectionCard kicker="GOVERNANCE" title="Prompt governance" bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="admin-prompts-table">
            <DataTableHead>
              <tr>
                <DataTableTh>ID</DataTableTh>
                <DataTableTh>Name</DataTableTh>
                <DataTableTh>Version</DataTableTh>
                <DataTableTh>Template (excerpt)</DataTableTh>
                <DataTableTh>Approver</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {prompts.map(p => (
                <DataTableRow key={p.id} testId={`prompt-row-${p.id}`}>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{p.id}</DataTableTd>
                  <DataTableTd className="text-sm text-white">{p.name}</DataTableTd>
                  <DataTableTd className="font-mono text-xs">v{p.version}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3] truncate max-w-md">{p.template}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3]">{p.approved_by}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      )}

      {tab === "logs" && (
        <SectionCard kicker="AUDIT" title="Audit logs" bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="admin-audit-logs-table">
            <DataTableHead>
              <tr>
                <DataTableTh>Timestamp</DataTableTh>
                <DataTableTh>Actor</DataTableTh>
                <DataTableTh>Action</DataTableTh>
                <DataTableTh>Object</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {logs.map(l => (
                <DataTableRow key={l.id} testId={`log-${l.id}`}>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDateTime(l.event_ts)}</DataTableTd>
                  <DataTableTd className="text-xs text-[#E5E5E5]">{l.actor_user_email}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#0A84FF]">{l.action_type}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{l.object_type}: {l.object_id?.slice(0, 20)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      )}

      {tab === "ingest" && (
        <SectionCard kicker="INGESTION" title="Ingestion runs" bodyClassName="p-0">
          <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[70vh]" testId="admin-ingest-runs-table">
            <DataTableHead>
              <tr>
                <DataTableTh>Dataset</DataTableTh>
                <DataTableTh>Source</DataTableTh>
                <DataTableTh>User</DataTableTh>
                <DataTableTh align="right">Rows</DataTableTh>
                <DataTableTh>Status</DataTableTh>
                <DataTableTh>At</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {runs.length === 0 && (
                <DataTableRow>
                  <DataTableTd colSpan={6} className="p-6 text-center font-mono text-xs text-[#737373]">No ingestion runs yet. Upload a CSV from the Ingest page.</DataTableTd>
                </DataTableRow>
              )}
              {runs.map(r => (
                <DataTableRow key={r.id} testId={`run-${r.id}`}>
                  <DataTableTd className="font-mono text-xs text-white">{r.dataset}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3]">{r.source}</DataTableTd>
                  <DataTableTd className="text-xs text-[#A3A3A3]">{r.user_email}</DataTableTd>
                  <DataTableTd align="right" className="font-mono tabular-nums">{r.rows_loaded}/{r.rows_read}</DataTableTd>
                  <DataTableTd className="font-mono text-[10px] uppercase tracking-wider" style={{ color: r.status === "success" ? "#30D158" : "#FF9F0A" }}>{r.status}</DataTableTd>
                  <DataTableTd className="font-mono text-xs text-[#737373]">{fmtDateTime(r.run_end)}</DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </SectionCard>
      )}

      {tab === "notifications" && notifSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#262626] border border-[#262626]" data-testid="notifications-tab">
          <div className="bg-[#141414] p-5 lg:col-span-1">
            <h3 className="font-heading text-base text-white tracking-tight mb-4">SLA breach settings</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Enabled</span>
                <button
                  data-testid="toggle-notif-enabled"
                  onClick={() => saveNotifSettings({ enabled: !notifSettings.enabled })}
                  className={`relative w-10 h-5 transition-colors ${notifSettings.enabled ? "bg-[#30D158]" : "bg-[#262626]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${notifSettings.enabled ? "left-5" : "left-0.5"}`}></span>
                </button>
              </label>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-2">Severity threshold</div>
                <select
                  data-testid="sla-threshold"
                  value={notifSettings.sla_breach_severity_threshold}
                  onChange={(e) => saveNotifSettings({ sla_breach_severity_threshold: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#262626] px-3 py-2 text-sm text-white outline-none focus:border-white"
                >
                  <option value="critical">Critical only</option>
                  <option value="high">High + Critical</option>
                  <option value="medium">Medium + High + Critical</option>
                </select>
              </div>
              <button
                data-testid="scan-sla-btn"
                onClick={scanNow}
                className="w-full py-2.5 bg-white text-black font-mono text-xs uppercase tracking-wider hover:bg-[#E5E5E5] transition-colors"
              >
                Scan SLA now
              </button>

              <div className="border-t border-[#262626] pt-4 mt-2">
                <label className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Daily CFO brief</span>
                  <button
                    data-testid="toggle-daily-brief"
                    onClick={() => saveNotifSettings({ daily_brief_enabled: !notifSettings.daily_brief_enabled })}
                    className={`relative w-10 h-5 transition-colors ${notifSettings.daily_brief_enabled ? "bg-[#30D158]" : "bg-[#262626]"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${notifSettings.daily_brief_enabled ? "left-5" : "left-0.5"}`}></span>
                  </button>
                </label>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">Send at</span>
                  <input
                    data-testid="daily-brief-hour"
                    type="number" min="0" max="23"
                    value={notifSettings.daily_brief_hour_utc || 8}
                    onChange={(e) => saveNotifSettings({ daily_brief_hour_utc: parseInt(e.target.value, 10) })}
                    className="flex-1 bg-[#0A0A0A] border border-[#262626] px-2 py-1 text-sm text-white outline-none focus:border-white font-mono"
                  />
                  <span className="font-mono text-[10px] text-[#737373]">:00 UTC</span>
                </div>
                <button
                  data-testid="send-brief-btn"
                  onClick={sendBriefNow}
                  className="w-full py-2 bg-[#0A84FF]/10 border border-[#0A84FF]/40 text-[#0A84FF] font-mono text-xs uppercase tracking-wider hover:bg-[#0A84FF]/20 transition-colors"
                >
                  Send daily brief now
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] p-5">
            <h3 className="font-heading text-base text-white tracking-tight mb-4">Webhook URLs</h3>
            <div className="flex gap-2 mb-3">
              <input
                data-testid="webhook-input"
                value={newWebhook}
                onChange={e => setNewWebhook(e.target.value)}
                placeholder="https://hooks.example.com/..."
                className="flex-1 bg-[#0A0A0A] border border-[#262626] px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
              <button onClick={addWebhook} data-testid="add-webhook-btn" className="px-3 bg-[#0A0A0A] border border-[#404040] hover:bg-[#1F1F1F] transition-colors">
                <Plus size={12} className="text-white" />
              </button>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(notifSettings.webhook_urls || []).map(url => (
                <div key={url} className="flex items-center justify-between gap-2 bg-[#0A0A0A] border border-[#262626] px-3 py-2">
                  <span className="font-mono text-xs text-[#A3A3A3] truncate">{url}</span>
                  <button onClick={() => removeWebhook(url)} className="text-[#FF3B30] hover:text-white"><Trash size={12} /></button>
                </div>
              ))}
              {(!notifSettings.webhook_urls || notifSettings.webhook_urls.length === 0) && (
                <div className="font-mono text-[10px] text-[#525252]">No webhooks configured.</div>
              )}
            </div>
          </div>

          <div className="bg-[#141414] p-5">
            <h3 className="font-heading text-base text-white tracking-tight mb-4">Email recipients <span className="font-mono text-[10px] text-[#FF9F0A] uppercase tracking-wider ml-2">stub · logs only</span></h3>
            <div className="flex gap-2 mb-3">
              <input
                data-testid="email-input"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="cfo@company.com"
                className="flex-1 bg-[#0A0A0A] border border-[#262626] px-3 py-2 text-sm text-white outline-none focus:border-white"
              />
              <button onClick={addEmail} data-testid="add-email-btn" className="px-3 bg-[#0A0A0A] border border-[#404040] hover:bg-[#1F1F1F] transition-colors">
                <Plus size={12} className="text-white" />
              </button>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {(notifSettings.email_recipients || []).map(email => (
                <div key={email} className="flex items-center justify-between gap-2 bg-[#0A0A0A] border border-[#262626] px-3 py-2">
                  <span className="font-mono text-xs text-[#A3A3A3] truncate">{email}</span>
                  <button onClick={() => removeEmail(email)} className="text-[#FF3B30] hover:text-white"><Trash size={12} /></button>
                </div>
              ))}
              {(!notifSettings.email_recipients || notifSettings.email_recipients.length === 0) && (
                <div className="font-mono text-[10px] text-[#525252]">No email recipients. Wire Resend/SendGrid in /app/backend/app/notifier.py.</div>
              )}
            </div>
          </div>

          <div className="bg-[#141414] p-5 lg:col-span-3">
            <h3 className="font-heading text-base text-white tracking-tight mb-4">Recent notifications ({notifications.length})</h3>
            <DataTable className="rounded-xl border border-[#262626]/70 bg-[#0A0A0A]/25" maxHeightClassName="max-h-[50vh]" testId="admin-notifications-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>When</DataTableTh>
                  <DataTableTh>Event</DataTableTh>
                  <DataTableTh>Title</DataTableTh>
                  <DataTableTh>Dispatched</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {notifications.length === 0 && (
                  <DataTableRow>
                    <DataTableTd colSpan={4} className="p-6 text-center font-mono text-xs text-[#737373]">No notifications yet. Trigger SLA scan or wait for overdue cases.</DataTableTd>
                  </DataTableRow>
                )}
                {notifications.slice(0, 20).map(n => (
                  <DataTableRow key={n.id} testId={`notif-${n.id}`}>
                    <DataTableTd className="font-mono text-xs text-[#A3A3A3]">{fmtDateTime(n.created_at)}</DataTableTd>
                    <DataTableTd className="font-mono text-xs text-[#0A84FF]">{n.event_type}</DataTableTd>
                    <DataTableTd className="text-sm text-white truncate max-w-lg">{n.title}</DataTableTd>
                    <DataTableTd className="font-mono text-xs text-[#A3A3A3]">
                      {(n.dispatched_to || []).length} webhook · {n.email_stub_logged ? "email ✓" : "—"}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </div>
      )}

      {tab === "ai-ops" && (
        <div className="space-y-px">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#262626] border border-[#262626]" data-testid="ai-ops-tab">
            <div className="bg-[#141414] p-6">
              <h3 className="font-heading text-base text-white tracking-tight mb-4">Copilot vector index</h3>
              <div className="font-mono text-xs text-[#A3A3A3] space-y-2 mb-4">
                <div>Algorithm: <span className="text-white">{indexStatus?.algorithm || "—"}</span></div>
                <div>Indexed docs: <span className="text-white tabular-nums">{indexStatus?.indexed_docs ?? "—"}</span></div>
                <div>Matrix: <span className="text-white tabular-nums">{indexStatus?.matrix_shape ? `${indexStatus.matrix_shape[0]} × ${indexStatus.matrix_shape[1]}` : "—"}</span></div>
              </div>
              <button
                data-testid="rebuild-index-btn"
                onClick={rebuildIndex}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F] transition-colors"
              >
                Rebuild index
              </button>
            </div>
            <div className="bg-[#141414] p-6">
              <h3 className="font-heading text-base text-white tracking-tight mb-4">Anomaly model</h3>
              <div className="font-mono text-xs text-[#A3A3A3] space-y-2 mb-4">
                <div>Model: <span className="text-white">IsolationForest(n=80)</span></div>
                <div>Blend: <span className="text-white">60% iforest + 40% per-control z-score</span></div>
                <div>Governance: <span className="text-white">tier-1 · approved · auditor-registered</span></div>
              </div>
              <div className="flex gap-2">
                <button
                  data-testid="recalibrate-btn"
                  onClick={recalibrate}
                  disabled={recalibrating}
                  className="px-4 py-2 bg-[#0A0A0A] border border-[#404040] text-xs font-mono uppercase tracking-wider text-white hover:bg-[#1F1F1F] transition-colors disabled:opacity-50"
                >
                  {recalibrating ? "Recalibrating..." : "Recalibrate scores"}
                </button>
                <button
                  data-testid="train-model-btn"
                  onClick={trainModel}
                  disabled={training}
                  className="px-4 py-2 bg-white text-black text-xs font-mono uppercase tracking-wider hover:bg-[#E5E5E5] transition-colors disabled:opacity-50"
                >
                  {training ? "Training..." : "Train new version"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626]">
            <div className="p-5 border-b border-[#262626] flex items-center justify-between">
              <h3 className="font-heading text-base text-white tracking-tight">Model versions · M-002 (anomaly-iforest)</h3>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#737373]">{modelVersions.length} versions</span>
            </div>
            <DataTable className="rounded-none border-0 bg-transparent" maxHeightClassName="max-h-[55vh]" testId="admin-model-versions-table">
              <DataTableHead>
                <tr>
                  <DataTableTh>Version</DataTableTh>
                  <DataTableTh>Trained by</DataTableTh>
                  <DataTableTh>When</DataTableTh>
                  <DataTableTh align="right">Train / Test</DataTableTh>
                  <DataTableTh align="right">Anomaly rate</DataTableTh>
                  <DataTableTh>Status</DataTableTh>
                  <DataTableTh align="right">Action</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {modelVersions.length === 0 && (
                  <DataTableRow>
                    <DataTableTd colSpan={7} className="p-6 text-center font-mono text-xs text-[#737373]">No versions yet. Click &quot;Train new version&quot; above.</DataTableTd>
                  </DataTableRow>
                )}
                {modelVersions.map(v => (
                  <DataTableRow key={v.id} testId={`version-${v.version_label}`}>
                    <DataTableTd className="font-mono text-xs text-white">{v.version_label} {v.active && <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-[#30D158]">· active</span>}</DataTableTd>
                    <DataTableTd className="text-xs text-[#A3A3A3]">{v.trained_by}</DataTableTd>
                    <DataTableTd className="font-mono text-xs text-[#737373]">{fmtDateTime(v.created_at)}</DataTableTd>
                    <DataTableTd align="right" className="font-mono tabular-nums text-xs text-[#A3A3A3]">{v.metrics?.n_train}/{v.metrics?.n_test}</DataTableTd>
                    <DataTableTd align="right" className="font-mono tabular-nums text-xs" style={{ color: (v.metrics?.test_anomaly_rate || 0) > 0.1 ? "#FF9F0A" : "#30D158" }}>
                      {((v.metrics?.test_anomaly_rate || 0) * 100).toFixed(2)}%
                    </DataTableTd>
                    <DataTableTd><span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5" style={{
                      color: v.approval_status === "approved" ? "#30D158" : "#FF9F0A",
                      background: v.approval_status === "approved" ? "rgba(48,209,88,0.1)" : "rgba(255,159,10,0.1)",
                    }}>{v.approval_status}</span></DataTableTd>
                    <DataTableTd align="right">
                      {v.approval_status !== "approved" && (
                        <button
                          data-testid={`approve-${v.version_label}`}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); approveVersion(v.id); }}
                          className="px-3 py-1 bg-[#30D158]/10 border border-[#30D158]/40 text-[#30D158] text-xs font-mono uppercase tracking-wider hover:bg-[#30D158]/20 transition-colors"
                        >Approve & activate</button>
                      )}
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        </div>
      )}
      </div>
    </PageShell>
  );
}
