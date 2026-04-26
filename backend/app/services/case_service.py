"""Case domain helpers shared by routers and application lifecycle (startup seeding)."""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.utils.timeutil import iso_utc


def case_from_exception(ex: dict, owner_email: str, owner_name: Optional[str]) -> dict[str, Any]:
    """Build a new case document from a control exception (idempotent only at insert site)."""
    now = datetime.now(timezone.utc)
    due = now + timedelta(days=7 if ex["severity"] in ("critical", "high") else 14)
    return {
        "id": str(uuid.uuid4()),
        "exception_id": ex["id"],
        "control_code": ex["control_code"],
        "control_name": ex["control_name"],
        "title": ex["title"],
        "summary": ex["summary"],
        "severity": ex["severity"],
        "status": "open",
        "priority": "P1" if ex["severity"] == "critical" else "P2" if ex["severity"] == "high" else "P3",
        "owner_email": owner_email,
        "owner_name": owner_name,
        "due_date": iso_utc(due),
        "financial_exposure": ex["financial_exposure"],
        "entity": ex["entity"],
        "process": ex["process"],
        "detected_at": ex["detected_at"],
        "opened_at": iso_utc(now),
        "closed_at": None,
        "root_cause_category": None,
    }
