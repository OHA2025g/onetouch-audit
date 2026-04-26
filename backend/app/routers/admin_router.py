"""Admin, seed-reset, CSV ingest, model registry/training, notifications, exports, auditor portal."""
import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.auth import get_current_user
from app.deps import db, audit_log, iso
from app.models import IngestResult
from app.seed import seed_database
from app.controls_engine import run_all_controls
from app.exports import build_pdf, build_xlsx
from app.analytics import cfo_cockpit
from app.notifier import (get_settings as get_notif_settings, save_settings as save_notif_settings,
                          scan_sla_breaches, list_notifications, send_daily_brief)
from app.training import train_anomaly_model, list_model_versions, approve_model_version

router = APIRouter(tags=["admin-ops"])


# ---------- Admin ----------
@router.get("/admin/models")
async def admin_models(current=Depends(get_current_user)):
    return [m async for m in db.model_registry.find({}, {"_id": 0})]


@router.get("/admin/prompts")
async def admin_prompts(current=Depends(get_current_user)):
    return [p async for p in db.prompt_registry.find({}, {"_id": 0})]


@router.get("/admin/audit-logs")
async def admin_audit_logs(limit: int = 100, current=Depends(get_current_user)):
    return [l async for l in db.audit_logs.find({}, {"_id": 0}).sort("event_ts", -1).limit(limit)]


@router.get("/admin/summary")
async def admin_summary(current=Depends(get_current_user)):
    return {
        "collections": {c: await db[c].count_documents({}) for c in [
            "users", "entities", "vendors", "invoices", "payments", "journals",
            "controls", "exceptions", "cases", "audit_logs", "copilot_sessions",
        ]},
    }


@router.post("/admin/seed-reset")
async def admin_seed_reset(current=Depends(get_current_user)):
    if current["role"] not in ("CFO", "Internal Auditor", "Controller"):
        raise HTTPException(403, "Insufficient permissions")
    result = await seed_database(db, force=True)
    await run_all_controls(db)
    await audit_log(current["email"], "seed_reset", "system", "all", result)
    return {"reseeded": True, "counts": result}


@router.get("/admin/model-versions")
async def admin_model_versions(current=Depends(get_current_user)):
    return await list_model_versions(db)


@router.post("/admin/model-versions/{version_id}/approve")
async def admin_approve_version(version_id: str, current=Depends(get_current_user)):
    if current["role"] not in ("CFO", "Internal Auditor"):
        raise HTTPException(403, "Approval requires CFO or Internal Auditor role")
    result = await approve_model_version(db, version_id, current["email"])
    if result.get("error"):
        raise HTTPException(404, "Version not found")
    await audit_log(current["email"], "approve_model_version", "model_version", version_id)
    return result


# ---------- CSV ingest ----------
@router.post("/ingest/csv", response_model=IngestResult)
async def ingest_csv(
    file: UploadFile = File(...),
    dataset: str = Form(...),
    current=Depends(get_current_user),
):
    dataset = dataset.strip().lower()
    if dataset not in ("vendors", "invoices"):
        raise HTTPException(400, "Unsupported dataset. Use 'vendors' or 'invoices'.")
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    rows_ingested = 0
    rows_failed = 0
    now = datetime.now(timezone.utc)
    docs = []
    for row in reader:
        try:
            if dataset == "vendors":
                doc = {
                    "id": row.get("id") or f"V-CSV-{uuid.uuid4().hex[:8]}",
                    "vendor_code": row.get("vendor_code") or row.get("id") or f"V-{uuid.uuid4().hex[:6]}",
                    "vendor_name": row["vendor_name"],
                    "entity": row.get("entity", "US-HQ"),
                    "bank_account_hash": row.get("bank_account_hash", "HASHCSV"),
                    "bank_changed_at": row.get("bank_changed_at", iso(now - timedelta(days=365))),
                    "status": row.get("status", "active"),
                    "created_at": iso(now),
                }
            else:
                doc = {
                    "id": row.get("id") or f"INV-CSV-{uuid.uuid4().hex[:8]}",
                    "invoice_number": row["invoice_number"],
                    "vendor_id": row.get("vendor_id", "V-1000"),
                    "vendor_name": row.get("vendor_name", "Unknown"),
                    "entity": row.get("entity", "US-HQ"),
                    "invoice_date": row.get("invoice_date", iso(now)),
                    "amount": float(row["amount"]),
                    "tax_amount": float(row.get("tax_amount", 0)),
                    "expected_tax_amount": float(row.get("expected_tax_amount", float(row.get("amount", 0)) * 0.18)),
                    "status": row.get("status", "posted"),
                    "po_id": row.get("po_id") or None,
                    "approver_email": row.get("approver_email") or None,
                    "created_at": iso(now),
                }
            docs.append(doc)
            rows_ingested += 1
        except Exception:
            rows_failed += 1
    if docs:
        await db[dataset].insert_many(docs)
    lineage_id = str(uuid.uuid4())
    await db.ingestion_runs.insert_one({
        "id": lineage_id,
        "dataset": dataset,
        "source": f"csv_upload:{file.filename}",
        "rows_read": rows_ingested + rows_failed,
        "rows_loaded": rows_ingested,
        "rows_failed": rows_failed,
        "status": "success" if rows_failed == 0 else "partial",
        "run_start": iso(now),
        "run_end": iso(datetime.now(timezone.utc)),
        "user_email": current["email"],
    })
    await audit_log(current["email"], "csv_ingest", "dataset", dataset,
                    {"filename": file.filename, "rows": rows_ingested})
    return {
        "dataset": dataset,
        "rows_ingested": rows_ingested,
        "rows_failed": rows_failed,
        "lineage_id": lineage_id,
        "ingested_at": iso(datetime.now(timezone.utc)),
    }


@router.get("/admin/ingestion-runs")
async def ingestion_runs(current=Depends(get_current_user)):
    return [r async for r in db.ingestion_runs.find({}, {"_id": 0}).sort("run_end", -1).limit(50)]


# ---------- Exports ----------
def _io_bytes(data: bytes):
    return io.BytesIO(data)


@router.get("/reports/audit-committee-pack.pdf")
async def report_pdf(current=Depends(get_current_user)):
    pdf = await build_pdf(db)
    await audit_log(current["email"], "export_pdf", "report", "audit-committee-pack")
    return StreamingResponse(
        _io_bytes(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="audit-committee-pack.pdf"'},
    )


@router.get("/reports/audit-committee-pack.xlsx")
async def report_xlsx(current=Depends(get_current_user)):
    xlsx = await build_xlsx(db)
    await audit_log(current["email"], "export_xlsx", "report", "audit-committee-pack")
    return StreamingResponse(
        _io_bytes(xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="audit-committee-pack.xlsx"'},
    )


# ---------- External Auditor Portal (read-only) ----------
def _require_auditor_or_internal(current=Depends(get_current_user)):
    if current["role"] not in ("External Auditor", "Internal Auditor", "CFO", "Controller"):
        raise HTTPException(403, "Auditor access required")
    return current


@router.get("/auditor/pack")
async def auditor_pack(current=Depends(_require_auditor_or_internal)):
    cockpit = await cfo_cockpit(db)
    controls = [c async for c in db.controls.find({}, {"_id": 0}).sort("code", 1)]
    recent_runs = [r async for r in db.test_runs.find({}, {"_id": 0}).sort("run_ts", -1).limit(20)]
    policies = [p async for p in db.policies.find({}, {"_id": 0})]
    open_cases = [c async for c in db.cases.find({"status": {"$ne": "closed"}}, {"_id": 0})
                                           .sort("financial_exposure", -1).limit(25)]
    return {
        "generated_at": iso(datetime.now(timezone.utc)),
        "kpis": cockpit["kpis"],
        "heatmap": cockpit["heatmap"],
        "top_risks": cockpit["top_risks"],
        "controls": controls,
        "recent_runs": recent_runs,
        "policies": policies,
        "open_cases": open_cases,
    }


@router.get("/auditor/controls/{control_id}")
async def auditor_control_detail(control_id: str, current=Depends(_require_auditor_or_internal)):
    c = await db.controls.find_one({"id": control_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Control not found")
    runs = [r async for r in db.test_runs.find({"control_id": control_id}, {"_id": 0}).sort("run_ts", -1).limit(10)]
    exceptions = [e async for e in db.exceptions.find({"control_id": control_id}, {"_id": 0}).limit(50)]
    return {"control": c, "recent_runs": runs, "exceptions": exceptions}


# ---------- Notifications ----------
@router.get("/notifications")
async def notifications_list(limit: int = 50, current=Depends(get_current_user)):
    return await list_notifications(db, limit=limit)


@router.get("/notifications/settings")
async def notifications_settings_get(current=Depends(get_current_user)):
    return await get_notif_settings(db)


@router.patch("/notifications/settings")
async def notifications_settings_patch(patch: Dict[str, Any], current=Depends(get_current_user)):
    if current["role"] not in ("CFO", "Controller", "Internal Auditor", "Compliance Head"):
        raise HTTPException(403, "Insufficient permissions")
    result = await save_notif_settings(db, patch)
    await audit_log(current["email"], "update_notification_settings", "system", "notifications", patch)
    return result


@router.post("/notifications/scan-sla")
async def notifications_scan_now(current=Depends(get_current_user)):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot trigger scans")
    return await scan_sla_breaches(db)


@router.post("/notifications/daily-brief/send")
async def daily_brief_send_now(current=Depends(get_current_user)):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot dispatch briefs")
    result = await send_daily_brief(db)
    await audit_log(current["email"], "send_daily_brief", "notification", result.get("id", "skipped"))
    return result


# ---------- Anomaly Training ----------
@router.post("/anomaly/train")
async def anomaly_train(body: Dict[str, Any] = None, current=Depends(get_current_user)):
    if current["role"] not in ("CFO", "Internal Auditor", "Controller"):
        raise HTTPException(403, "Training requires CFO / Controller / Internal Auditor role")
    body = body or {}
    result = await train_anomaly_model(
        db,
        trained_by=current["email"],
        notes=body.get("notes", ""),
        contamination=float(body.get("contamination", 0.06)),
        n_estimators=int(body.get("n_estimators", 100)),
    )
    if result.get("error"):
        raise HTTPException(400, result["error"])
    await audit_log(current["email"], "train_anomaly_model", "model_version", result["id"],
                    {"version_label": result["version_label"]})
    return result
