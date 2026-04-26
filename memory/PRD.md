# One Touch Audit AI — PRD (living)

**Date:** 2026-02-24 (v1.0), 2026-04-24 (v2.0 Phase 2)
**Status:** v2.0 — Phase 2 expansion shipped (23 controls, 8 processes)

## Original problem statement
Build an end-to-end One-Touch AI-driven audit system with a dashboard — a CFO-grade continuous assurance Finance Control Command Center covering CCM, AI anomaly detection, evidence graph, case management, audit readiness, and governed AI copilot — per the full blueprint provided.

## Architecture (as built)
- **Backend**: FastAPI + Motor + MongoDB. Modular: `app/auth.py`, `app/models.py`, `app/seed.py`, `app/controls_engine.py`, `app/copilot.py`, `app/analytics.py`, `app/vector_store.py`, `app/anomaly.py`, `app/notifier.py`, `app/exports.py`, `app/drill.py`, `app/training.py`, `app/phase2.py` (Phase 2 seed + control catalog), `app/controls_phase2.py` (Phase 2 runners), `server.py`.
- **Frontend**: React + Tailwind + shadcn + Recharts + Phosphor icons. Dark Swiss/brutalist (Cabinet Grotesk + IBM Plex Sans/Mono).
- **AI**: Gemini (`gemini-3-flash-preview`) via emergentintegrations.
- **Auth**: JWT + bcrypt, 6 seeded personas.
- **Scheduling**: APScheduler — SLA scans every 5 minutes + Daily CFO brief cron.

## User Personas
CFO · Financial Controller · Internal Auditor · Compliance Head · Process Owner · External Auditor (read-only).

## Process coverage
8 processes across the control pack:
1. Procure-to-Pay (P2P)
2. Record-to-Report (R2R)
3. Access/SoD
4. **Order-to-Cash** (Phase 2)
5. **Payroll** (Phase 2)
6. **Treasury** (expanded in Phase 2)
7. **Tax** (expanded in Phase 2)
8. **Fixed Assets** (Phase 2)

## Control pack (23 controls total)
### Phase 1 (12 controls)
C-AP-001..005 (P2P), C-GL-001..003 (R2R), C-ACC-001..002 (Access), C-TR-001 (Treasury recon), C-TX-001 (Tax).

### Phase 2 (11 controls added 2026-04-24)
- **Order-to-Cash**: C-OTC-001 Credit Limit Breach · C-OTC-002 Aged AR > 90d · C-OTC-003 Revenue Cutoff Risk.
- **Payroll**: C-PAY-001 Ghost Employee · C-PAY-002 Duplicate Payroll Entry.
- **Treasury**: C-TR-002 Off-Hours Large Wire · C-TR-003 FX Rate Deviation.
- **Tax**: C-TX-002 Withholding Shortfall.
- **Fixed Assets**: C-FA-001 Depreciation Missing · C-FA-002 Depreciation on Disposed Asset · C-FA-003 CapEx Over Budget.

## Phase 2 data model additions
`customers`, `sales_orders`, `ar_invoices`, `customer_receipts`, `employees`, `payroll_runs`, `payroll_entries`, `bank_accounts`, `bank_transactions`, `fx_rates`, `tax_filings`, `withholding_records`, `fixed_assets`, `depreciation_schedules`, `capex_projects`.

## Drill-down types (14)
Phase 1: `invoice`, `payment`, `journal`, `vendor`, `user`, `control`.
Phase 2: `customer`, `ar_invoice`, `sales_order`, `employee`, `payroll_entry`, `bank_transaction`, `fixed_asset`, `capex_project`.

## What's been implemented

### 2026-02-24 — Iteration 1 (MVP)
- 12-rule continuous controls monitoring engine.
- Seeded finance data (entities / vendors / invoices / POs / GRNs / payments / journals / recons / access events / SoD).
- 5 persona dashboards, evidence graph, case workflow, CSV upload, governance (model/prompt registries, audit logs), Copilot (RAG + citations + human-review).

### 2026-02-24 — Iteration 2 (5 enhancements)
1. Vector store for Copilot (TF-IDF 527 docs).
2. Anomaly ML model (IsolationForest + z-score blend).
3. External Auditor read-only portal.
4. SLA breach notifications (webhook + email stub + Slack).
5. Audit committee pack (PDF + XLSX).

### 2026-02-24 — Iteration 3 (polish)
- RoleHome redirect for External Auditor → `/auditor`.
- Daily CFO brief via Slack (cron at configurable hour).
- Separate anomaly training job with model_registry versioning + approval workflow.
- Granular drill-down views across every clickable element.

### 2026-04-24 — Iteration 4 (Phase 2 expansion)
- Added 5 new process areas (O2C, Payroll, Treasury deeper, Tax deeper, Fixed Assets).
- 11 new deterministic controls with dedicated runners.
- 15 new seeded collections with realistic violations injected (credit-limit breaches, aged AR, revenue cutoff, ghost employees, duplicate payroll, off-hours wires, FX deviation, WHT shortfall, missing depreciation, depreciation on disposed assets, over-budget CapEx).
- 8 new drill types + 8 new DrillView renderers (Customer, ARInvoice, SalesOrder, Employee, PayrollEntry, BankTransaction, FixedAsset, CapEx).
- Evidence graph + analytics heatmap auto-pick up new processes.
- Idempotent seed upgrade path so existing Phase 1 DBs upgrade in place without losing state.
- Test coverage: 37/37 pytest pass (100%) — `/app/backend/tests/test_phase2.py`.

### 2026-04-24 — Iteration 5 (Theme + Insight Engine)
1. **Global theme toggle** — new `data-testid='theme-toggle-btn'` in topbar flips `<html data-theme>` between dark (Swiss/brutalist) and light (ivory/charcoal). Persists to `localStorage['onetouch-theme']`. Light mode implemented as a single `[data-theme="light"]` CSS block overriding the 14 hex tokens used across the app — no page rewrites required. ThemedToaster matches.
2. **ML + NLP insight engine** — new `GET /api/insights/{section}` endpoint (`app/insights.py`). Deterministic per-section snapshot aggregators feed Gemini 3 Flash (via emergentintegrations) with a structured prompt that returns `{insights[], recommendations[], action_items[]}`. In-memory TTL cache (10 min, per user). Heuristic fallback triggered on LLM budget exhaustion. `<InsightPanel />` embedded on 7 pages: CFO Cockpit, Controller, Audit Workspace, Compliance, My Cases, All Cases, Evidence Explorer. External Auditor RBAC allows only `evidence`+`audit` sections. Action items link directly to drill pages. Refresh + collapse affordances included. 20/20 pytest pass.

### 2026-04-24 — Iteration 6 (P3 Refactor)
Pure structural refactor, zero behaviour change — **61/61 regression tests pass**.
- **Backend**: split `server.py` 824 → **184 lines**. New modules under `/app/backend/app/routers/`:
  - `auth_router.py` (32 lines)
  - `dashboards_router.py` (53)
  - `controls_router.py` (79)
  - `cases_router.py` (127)
  - `evidence_ai_router.py` (84)
  - `admin_router.py` (274)
  - `deps.py` (41) — shared db/client/logger + `iso` + `audit_log` helper
- **Frontend**: split `DrillView.jsx` 1015 → **131 lines** (dispatcher). Each drill renderer now lives under `/app/frontend/src/pages/drill/` (one file per type, 14 files + `shared.jsx`).
- All routes, RBAC, response shapes, and seed data preserved byte-for-byte (verified against iteration_5 baseline via `/app/backend/tests/test_refactor_regression.py`).

## Prioritized backlog
- **P1**: Multi-entity rollups with drill between entity cubes.
- **P1**: Retention & legal hold policy enforcement (immutable WORM flags on closed cases).
- **P2**: Stripe-gated enterprise feature flags (monetization).
- **P2**: Mobile-responsive layout for CFO cockpit.
- **P2**: Vector embeddings via Gemini/OpenAI embedding API (upgrade from TF-IDF) once budget restored.
- **P3**: External ERP source connectors (SAP/Oracle).
- **P3**: Refactor server.py (~800 lines) into routers.

## Known ops notes
- Phase 2 seed is idempotent — checks `customers` count before inserting. Force reset remains available.
- Emergent LLM Key budget: copilot uses graceful fallback when exhausted.
- External Auditor RBAC verified end-to-end after Phase 2 additions.
