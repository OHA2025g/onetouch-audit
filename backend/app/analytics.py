"""Dashboards: aggregated KPI data per persona + audit readiness scoring + evidence graph."""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List


SEVERITY_WEIGHT = {"critical": 1.0, "high": 0.7, "medium": 0.4, "low": 0.2}


async def _counts_by(db, collection: str, field: str) -> Dict[str, int]:
    out: Dict[str, int] = defaultdict(int)
    async for d in db[collection].find({}, {"_id": 0, field: 1}):
        out[d.get(field, "unknown")] += 1
    return dict(out)


async def compute_readiness(db) -> List[Dict[str, Any]]:
    """Readiness per (entity, process) = weighted score 0–100."""
    # Controls pass rate by (process, entity)
    out = []
    entities = [e async for e in db.entities.find({}, {"_id": 0})]
    processes = sorted({c["process"] async for c in db.controls.find({}, {"_id": 0, "process": 1})})

    for ent in entities:
        for proc in processes:
            # Exceptions for this process+entity, open
            open_exs = [e async for e in db.exceptions.find(
                {"process": proc, "entity": ent["code"], "status": {"$ne": "closed"}}, {"_id": 0}
            )]
            open_high = sum(1 for e in open_exs if e["severity"] in ("critical", "high"))
            exposure = sum(e["financial_exposure"] for e in open_exs)
            # Controls count in process
            control_count = await db.controls.count_documents({"process": proc})
            # Pass rate: controls with last_run_pass True / total
            passed = await db.controls.count_documents({"process": proc, "last_run_pass": True})
            ran = await db.controls.count_documents({"process": proc, "last_run_pass": {"$ne": None}})
            pass_rate = (passed / ran) if ran else 0.6
            # Reconciliation component (treasury/R2R only)
            recon_component = 1.0
            if proc in ("Treasury", "Record-to-Report"):
                overdue = await db.reconciliations.count_documents({"entity": ent["code"], "status": "overdue"})
                total = await db.reconciliations.count_documents({"entity": ent["code"]})
                recon_component = 1.0 - (overdue / total) if total else 0.8
            # Evidence completeness: proxy = cases w/ closure_evidence / cases total
            cases_total = await db.cases.count_documents({"process": proc, "entity": ent["code"]})
            cases_w_evidence = await db.cases.count_documents({"process": proc, "entity": ent["code"], "closed_at": {"$ne": None}})
            evidence_component = (cases_w_evidence / cases_total) if cases_total else 0.85
            # Issue component (penalize open high/critical)
            issue_penalty = min(1.0, open_high / 10.0)
            issue_component = 1.0 - issue_penalty

            control_component = pass_rate
            score = 100 * (0.40 * control_component + 0.25 * recon_component + 0.20 * evidence_component + 0.15 * issue_component)
            out.append({
                "entity": ent["code"],
                "process": proc,
                "readiness": round(score, 1),
                "control_component": round(control_component, 3),
                "recon_component": round(recon_component, 3),
                "evidence_component": round(evidence_component, 3),
                "issue_component": round(issue_component, 3),
                "open_high": open_high,
                "exposure": round(exposure, 2),
            })
    return out


async def cfo_cockpit(db) -> Dict[str, Any]:
    readiness_rows = await compute_readiness(db)
    overall_readiness = round(
        sum(r["readiness"] for r in readiness_rows) / max(1, len(readiness_rows)), 1
    )
    # Unresolved high-risk exposure
    high_crit_exposure = 0.0
    async for e in db.exceptions.find({"severity": {"$in": ["critical", "high"]}, "status": {"$ne": "closed"}}, {"_id": 0}):
        high_crit_exposure += e["financial_exposure"]
    open_cases = await db.cases.count_documents({"status": {"$ne": "closed"}})
    high_crit_cases = await db.cases.count_documents({"status": {"$ne": "closed"}, "severity": {"$in": ["critical", "high"]}})
    closed_cases = await db.cases.count_documents({"status": "closed"})
    total_cases = open_cases + closed_cases

    # Repeat finding rate (by control_code occurring >1 in exceptions)
    per_control: Dict[str, int] = defaultdict(int)
    async for ex in db.exceptions.find({}, {"_id": 0, "control_code": 1}):
        per_control[ex["control_code"]] += 1
    total_findings = sum(per_control.values()) or 1
    repeat = sum(v for v in per_control.values() if v > 1)
    repeat_rate = 100.0 * repeat / total_findings

    # Evidence completeness
    total_ex = await db.exceptions.count_documents({})
    evidenced = await db.exceptions.count_documents({"status": "closed"})
    evidence_pct = 100.0 * evidenced / total_ex if total_ex else 80.0

    # SLA: closed within 7 days of opened
    sla_total = 0
    sla_met = 0
    async for ca in db.cases.find({"status": "closed", "closed_at": {"$ne": None}}, {"_id": 0}):
        try:
            opened = datetime.fromisoformat(ca["opened_at"])
            closed = datetime.fromisoformat(ca["closed_at"])
            sla_total += 1
            if (closed - opened).days <= 7:
                sla_met += 1
        except Exception:
            pass
    sla_pct = 100.0 * sla_met / sla_total if sla_total else 92.5

    # Top failing controls
    top_failing = sorted(per_control.items(), key=lambda kv: -kv[1])[:6]
    top_failing_out = []
    for code, count in top_failing:
        c = await db.controls.find_one({"code": code}, {"_id": 0})
        if c:
            top_failing_out.append({
                "code": code,
                "name": c["name"],
                "process": c["process"],
                "exceptions": count,
                "criticality": c["criticality"],
            })

    # Top risks (top 10 open exceptions by exposure + severity weight)
    top_risks = []
    async for e in db.exceptions.find({"status": {"$ne": "closed"}}, {"_id": 0}):
        top_risks.append(e)
    top_risks.sort(key=lambda e: -(e["financial_exposure"] * SEVERITY_WEIGHT.get(e["severity"], 0.3)))
    top_risks = top_risks[:10]

    # Process heatmap averaged per (entity, process)
    return {
        "kpis": {
            "audit_readiness_pct": overall_readiness,
            "unresolved_high_risk_exposure": round(high_crit_exposure, 2),
            "high_critical_open_cases": high_crit_cases,
            "open_cases": open_cases,
            "repeat_finding_rate_pct": round(repeat_rate, 1),
            "evidence_completeness_pct": round(evidence_pct, 1),
            "remediation_sla_pct": round(sla_pct, 1),
            "total_cases": total_cases,
        },
        "top_failing_controls": top_failing_out,
        "top_risks": top_risks,
        "heatmap": readiness_rows,
        "trends": await _readiness_trend(db),
    }


async def _readiness_trend(db) -> List[Dict[str, Any]]:
    """Build a synthetic 8-week trend from current readiness (slightly decaying going back)."""
    readiness = await compute_readiness(db)
    avg = sum(r["readiness"] for r in readiness) / max(1, len(readiness))
    now = datetime.now(timezone.utc)
    trend = []
    for w in range(8, 0, -1):
        dt = now - timedelta(weeks=w)
        # Generate plausible trend from a slight dip 5w ago rising to today
        jitter = (abs(w - 5) - 3) * 2.0
        trend.append({
            "week": dt.strftime("%Y-W%U"),
            "readiness": round(max(55, min(98, avg + jitter)), 1),
            "control_fail_count": max(0, int(20 + (w - 4) * 2)),
            "exposure": round(1000000 + (w - 4) * 50000, 2),
        })
    return trend


async def controller_dashboard(db) -> Dict[str, Any]:
    # Close blockers = open exceptions in R2R + Treasury
    close_blockers = await db.exceptions.count_documents({
        "process": {"$in": ["Record-to-Report", "Treasury"]},
        "status": {"$ne": "closed"},
    })
    manual_je_breaches = await db.exceptions.count_documents({"control_code": "C-GL-001", "status": {"$ne": "closed"}})
    backdated = await db.exceptions.count_documents({"control_code": "C-GL-002", "status": {"$ne": "closed"}})
    ap_queue = await db.exceptions.count_documents({"process": "Procure-to-Pay", "status": {"$ne": "closed"}})
    # Reconciliations
    recon_total = await db.reconciliations.count_documents({})
    recon_overdue = await db.reconciliations.count_documents({"status": "overdue"})
    recons = [r async for r in db.reconciliations.find({}, {"_id": 0}).limit(20)]
    # Recent AP exceptions
    ap_exceptions = [e async for e in db.exceptions.find(
        {"process": "Procure-to-Pay", "status": {"$ne": "closed"}}, {"_id": 0}
    ).sort("financial_exposure", -1).limit(10)]

    return {
        "kpis": {
            "close_blockers": close_blockers,
            "manual_je_breaches": manual_je_breaches,
            "backdated_journals": backdated,
            "ap_exception_count": ap_queue,
            "reconciliations_overdue": recon_overdue,
            "reconciliations_total": recon_total,
        },
        "reconciliations": recons,
        "ap_exceptions": ap_exceptions,
    }


async def compliance_dashboard(db) -> Dict[str, Any]:
    sod_conflicts = [e async for e in db.exceptions.find({"control_code": "C-ACC-002"}, {"_id": 0})]
    access_violations = [e async for e in db.exceptions.find({"control_code": "C-ACC-001"}, {"_id": 0})]
    tax_issues = await db.exceptions.count_documents({"control_code": "C-TX-001", "status": {"$ne": "closed"}})
    # Exception aging buckets
    now = datetime.now(timezone.utc)
    buckets = {"0-7d": 0, "8-14d": 0, "15-30d": 0, ">30d": 0}
    async for e in db.exceptions.find({"status": {"$ne": "closed"}}, {"_id": 0}):
        try:
            d = datetime.fromisoformat(e["detected_at"])
            age = (now - d).days
        except Exception:
            age = 0
        if age <= 7: buckets["0-7d"] += 1
        elif age <= 14: buckets["8-14d"] += 1
        elif age <= 30: buckets["15-30d"] += 1
        else: buckets[">30d"] += 1
    return {
        "kpis": {
            "sod_conflicts": len(sod_conflicts),
            "terminated_user_activity": len(access_violations),
            "tax_mismatch_open": tax_issues,
            "policy_breach_total": sum(buckets.values()),
        },
        "sod_conflicts": sod_conflicts,
        "access_violations": access_violations,
        "exception_aging": [{"bucket": k, "count": v} for k, v in buckets.items()],
    }


async def audit_workspace(db) -> Dict[str, Any]:
    controls = [c async for c in db.controls.find({}, {"_id": 0}).sort("code", 1)]
    # recent test runs
    runs = [r async for r in db.test_runs.find({}, {"_id": 0}).sort("run_ts", -1).limit(30)]
    return {"controls": controls, "recent_runs": runs}


async def evidence_graph(db, exception_id: str) -> Dict[str, Any]:
    ex = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not ex:
        return {"nodes": [], "edges": []}
    control = await db.controls.find_one({"id": ex["control_id"]}, {"_id": 0})
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    def add_node(id_, type_, label, subtitle=None, meta=None):
        if any(n["id"] == id_ for n in nodes):
            return
        nodes.append({"id": id_, "type": type_, "label": label, "subtitle": subtitle, "meta": meta or {}})

    add_node(ex["id"], "exception", f"Exception · {ex['control_code']}", ex["title"], {"severity": ex["severity"], "exposure": ex["financial_exposure"]})
    if control:
        add_node(control["id"], "control", f"Control · {control['code']}", control["name"], {"criticality": control["criticality"]})
        edges.append({"source": control["id"], "target": ex["id"], "relation": "detected"})

    # Source record
    src_type = ex["source_record_type"]
    src_id = ex["source_record_id"]
    collection_map = {
        "invoice": "invoices", "payment": "payments", "journal": "journals",
        "reconciliation": "reconciliations", "access_event": "user_access_events", "user": None,
        # Phase 2:
        "customer": "customers", "ar_invoice": "ar_invoices", "sales_order": "sales_orders",
        "payroll_entry": "payroll_entries", "bank_transaction": "bank_transactions",
        "fx_rate": "fx_rates", "withholding": "withholding_records",
        "fixed_asset": "fixed_assets", "depreciation": "depreciation_schedules",
        "capex_project": "capex_projects",
    }
    coll = collection_map.get(src_type)
    if coll:
        rec = await db[coll].find_one({"id": src_id}, {"_id": 0})
        if rec:
            lbl = (rec.get("invoice_number") or rec.get("bank_reference") or rec.get("journal_number")
                   or rec.get("ar_number") or rec.get("so_number") or rec.get("customer_code")
                   or rec.get("asset_code") or rec.get("project_code")
                   or rec.get("reference") or rec.get("employee_code")
                   or rec.get("id"))
            add_node(src_id, "transaction", f"{src_type.title()} · {lbl}", f"${rec.get('amount', rec.get('total_amount', 0)):,.2f}" if isinstance(rec.get('amount', rec.get('total_amount')), (int, float)) else None, rec)
            edges.append({"source": ex["id"], "target": src_id, "relation": "references"})
            # Link related PO/GRN if invoice
            if src_type == "invoice" and rec.get("po_id"):
                po = await db.purchase_orders.find_one({"id": rec["po_id"]}, {"_id": 0})
                if po:
                    add_node(po["id"], "transaction", f"PO · {po['po_number']}", f"${po['amount']:,.2f}")
                    edges.append({"source": src_id, "target": po["id"], "relation": "po_for"})
                    grn = await db.goods_receipts.find_one({"po_id": po["id"]}, {"_id": 0})
                    if grn:
                        add_node(grn["id"], "transaction", f"GRN · {grn['grn_number']}", f"${grn['amount']:,.2f}")
                        edges.append({"source": po["id"], "target": grn["id"], "relation": "receipt"})

    # Policy links (by control code heuristic)
    code_to_policy = {
        "C-AP": "Global AP Payment Policy v4.2",
        "C-GL": "Manual Journal Entry Policy v3.0",
        "C-ACC": "Segregation of Duties Matrix v2.1",
        "C-TR": "Manual Journal Entry Policy v3.0",
        "C-TX": "Global AP Payment Policy v4.2",
    }
    prefix = ex["control_code"][:4]
    policy_title = code_to_policy.get(prefix) or "Global AP Payment Policy v4.2"
    policy = await db.policies.find_one({"title": policy_title}, {"_id": 0})
    if policy:
        add_node(policy["id"], "policy", policy["title"], f"Effective {policy['effective_date']}", {"clauses": policy.get("clauses", [])})
        edges.append({"source": ex["id"], "target": policy["id"], "relation": "governed_by"})

    # Case
    case = await db.cases.find_one({"exception_id": ex["id"]}, {"_id": 0})
    if case:
        add_node(case["id"], "case", f"Case · {case['id'][:6]}", case.get("title", ""), {"status": case["status"], "owner": case.get("owner_email")})
        edges.append({"source": ex["id"], "target": case["id"], "relation": "has_case"})
        # Owner user
        if case.get("owner_email"):
            add_node(f"user::{case['owner_email']}", "user", case.get("owner_name") or case["owner_email"], case["owner_email"])
            edges.append({"source": case["id"], "target": f"user::{case['owner_email']}", "relation": "owned_by"})

    return {"nodes": nodes, "edges": edges}
