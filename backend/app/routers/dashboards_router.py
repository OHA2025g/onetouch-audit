"""Persona dashboards + audit readiness."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.deps import db
from app.analytics import (cfo_cockpit, controller_dashboard, compliance_dashboard,
                           audit_workspace, compute_readiness)

router = APIRouter(tags=["dashboards"])


@router.get("/dashboard/cfo")
async def dashboard_cfo(current=Depends(get_current_user)):
    return await cfo_cockpit(db)


@router.get("/dashboard/controller")
async def dashboard_controller(current=Depends(get_current_user)):
    return await controller_dashboard(db)


@router.get("/dashboard/audit")
async def dashboard_audit(current=Depends(get_current_user)):
    return await audit_workspace(db)


@router.get("/dashboard/compliance")
async def dashboard_compliance(current=Depends(get_current_user)):
    return await compliance_dashboard(db)


@router.get("/dashboard/my-cases")
async def dashboard_my_cases(current=Depends(get_current_user)):
    cases = [c async for c in db.cases.find({"owner_email": current["email"]}, {"_id": 0}).sort("due_date", 1)]
    open_count = sum(1 for c in cases if c["status"] != "closed")
    overdue = 0
    now = datetime.now(timezone.utc)
    for c in cases:
        try:
            if c["status"] != "closed" and datetime.fromisoformat(c["due_date"]) < now:
                overdue += 1
        except Exception:
            pass
    return {
        "kpis": {"my_open_cases": open_count, "overdue": overdue, "total_assigned": len(cases)},
        "cases": cases,
    }


@router.get("/readiness")
async def readiness(current=Depends(get_current_user)):
    return await compute_readiness(db)
