"""Control library + execution + exceptions list."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.deps import db, audit_log
from app.models import ControlOut, ExceptionOut
from app.controls_engine import run_control, run_all_controls

router = APIRouter(tags=["controls"])


@router.get("/controls", response_model=List[ControlOut])
async def controls_list(process: Optional[str] = None, criticality: Optional[str] = None,
                        current=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if process: q["process"] = process
    if criticality: q["criticality"] = criticality
    return [c async for c in db.controls.find(q, {"_id": 0}).sort("code", 1)]


@router.get("/controls/{control_id}")
async def control_detail(control_id: str, current=Depends(get_current_user)):
    c = await db.controls.find_one({"id": control_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Control not found")
    runs = [r async for r in db.test_runs.find({"control_id": control_id}, {"_id": 0}).sort("run_ts", -1).limit(20)]
    open_ex = [e async for e in db.exceptions.find({"control_id": control_id, "status": {"$ne": "closed"}}, {"_id": 0}).limit(50)]
    return {"control": c, "recent_runs": runs, "open_exceptions": open_ex}


@router.post("/controls/{control_id}/run")
async def control_run(control_id: str, current=Depends(get_current_user)):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot execute controls")
    c = await db.controls.find_one({"id": control_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Control not found")
    result = await run_control(db, c)
    await audit_log(current["email"], "run_control", "control", control_id, {"result": result})
    return result


@router.post("/controls/run-all")
async def controls_run_all(current=Depends(get_current_user)):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot execute controls")
    result = await run_all_controls(db)
    await audit_log(current["email"], "run_all_controls", "controls", "all",
                    {"total_exceptions": result["total_exceptions"]})
    return result


@router.get("/exceptions", response_model=List[ExceptionOut])
async def exceptions_list(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    process: Optional[str] = None,
    entity: Optional[str] = None,
    control_code: Optional[str] = None,
    limit: int = 200,
    current=Depends(get_current_user),
):
    q: Dict[str, Any] = {}
    if severity: q["severity"] = severity
    if status: q["status"] = status
    if process: q["process"] = process
    if entity: q["entity"] = entity
    if control_code: q["control_code"] = control_code
    return [e async for e in db.exceptions.find(q, {"_id": 0}).sort("financial_exposure", -1).limit(limit)]


@router.get("/exceptions/{exception_id}")
async def exception_detail(exception_id: str, current=Depends(get_current_user)):
    e = await db.exceptions.find_one({"id": exception_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Exception not found")
    case = await db.cases.find_one({"exception_id": exception_id}, {"_id": 0})
    return {"exception": e, "case": case}
