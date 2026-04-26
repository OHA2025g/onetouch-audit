"""Data trust / data quality visibility endpoints (Child prompt 3)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.deps import db
from app.services import connector_service as cs

router = APIRouter(prefix="/dq", tags=["data-trust"])


@router.get("/health")
async def dq_health(current=Depends(get_current_user)):
    return await cs.dq_health(db)


@router.get("/schema-validations")
async def dq_schema_validations(limit: int = Query(200, ge=1, le=1000), current=Depends(get_current_user)):
    return await cs.dq_schema_validations(db, limit=limit)

