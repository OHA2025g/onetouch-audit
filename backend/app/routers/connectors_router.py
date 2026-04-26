"""Connector admin endpoints: create/test/sync/backfill/runs/health/errors."""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from app.auth import get_current_user
from app.core.security import require_roles
from app.deps import db
from app.services import connector_service as cs

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.post("")
async def create_connector(
    body: Dict[str, Any] = Body(...),
    current=Depends(require_roles("CFO", "Controller", "Internal Auditor", "Compliance Head")),
):
    return await cs.create_connector(db, body, current["email"])


@router.post("/{connector_id}/activate")
async def activate_connector(
    connector_id: str,
    current=Depends(require_roles("CFO", "Internal Auditor", "Compliance Head")),
):
    from app.services.governance_approval_service import require_approval_or_raise

    await require_approval_or_raise(db, action="connector_activation", subject_type="connector", subject_id=connector_id)
    await db.source_connectors.update_one({"id": connector_id}, {"$set": {"status": "active"}})
    from app.deps import audit_log
    await audit_log(current["email"], "connector_activate", "connector", connector_id)
    c = await cs.get_connector(db, connector_id)
    if not c:
        raise HTTPException(404, "Connector not found")
    return c


@router.get("")
async def list_connectors(current=Depends(get_current_user)):
    return await cs.list_connectors(db)


@router.get("/{connector_id}")
async def get_connector(connector_id: str, current=Depends(get_current_user)):
    c = await cs.get_connector(db, connector_id)
    if not c:
        raise HTTPException(404, "Connector not found")
    return c


@router.post("/{connector_id}/test")
async def test_connector(
    connector_id: str,
    current=Depends(require_roles("CFO", "Controller", "Internal Auditor", "Compliance Head")),
):
    return await cs.test_connector(db, connector_id)


@router.post("/{connector_id}/sync")
async def sync_connector(
    connector_id: str,
    current=Depends(require_roles("CFO", "Controller", "Internal Auditor", "Compliance Head")),
):
    return await cs.run_sync(db, connector_id, mode="sync", initiated_by=current["email"])


@router.post("/{connector_id}/backfill")
async def backfill_connector(
    connector_id: str,
    current=Depends(require_roles("CFO", "Controller", "Internal Auditor", "Compliance Head")),
):
    return await cs.run_sync(db, connector_id, mode="backfill", initiated_by=current["email"])


@router.get("/{connector_id}/runs")
async def connector_runs(connector_id: str, current=Depends(get_current_user)):
    return await cs.list_runs(db, connector_id)


@router.get("/{connector_id}/health")
async def connector_health(connector_id: str, current=Depends(get_current_user)):
    # health = test + last run summary
    c = await cs.get_connector(db, connector_id)
    if not c:
        raise HTTPException(404, "Connector not found")
    last = (await cs.list_runs(db, connector_id))[:1]
    return {"connector": c, "last_run": last[0] if last else None}


@router.get("/{connector_id}/errors")
async def connector_errors(connector_id: str, current=Depends(get_current_user)):
    return await cs.list_errors(db, connector_id)

