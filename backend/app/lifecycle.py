"""Application startup and shutdown: seeding, scheduler, DB client teardown."""
from __future__ import annotations
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.auth import hash_password
from app.controls_engine import run_all_controls, run_control
from app.deps import client, db, logger, iso
from app.notifier import get_settings as get_notif_settings, scan_sla_breaches, send_daily_brief
from app.phase2 import seed_phase2
from app.seed import seed_database
from app.services.case_service import case_from_exception
from app.governance.ensure_baseline import ensure_governance_baseline
scheduler: Optional[AsyncIOScheduler] = None


async def on_startup() -> None:
    global scheduler  # noqa: PLW0603 — module-level AsyncIOScheduler for graceful shutdown

    # 1) Phase 1 seed (idempotent)
    res = await seed_database(db, force=False)
    logger.info("Seed result: %s", res)
    gbl = await ensure_governance_baseline(db)
    if gbl:
        logger.info("Governance baseline: %s", gbl)

    # 2) Phase 2 seed (opt-in; keep baseline dataset stable unless explicitly enabled)
    if os.environ.get("ENABLE_PHASE2", "").lower() in ("1", "true", "yes", "on"):
        try:
            phase2 = await seed_phase2(db, force=False)
            logger.info("Phase 2 seed: %s", phase2)
            if phase2.get("phase2_controls_added", 0) > 0 or phase2.get("phase2_seeded") != "already_present":
                new_codes = [c["code"] for c in (await db.controls.find(
                    {"code": {"$regex": "^(C-OTC|C-PAY|C-TR-002|C-TR-003|C-TX-002|C-FA)"}}, {"_id": 0, "code": 1}
                ).to_list(length=None))]
                for code in new_codes:
                    ctrl = await db.controls.find_one({"code": code}, {"_id": 0})
                    if ctrl:
                        await run_control(db, ctrl)
                logger.info("Ran Phase 2 controls: %s", len(new_codes))
        except Exception as e:  # noqa: BLE001
            logger.warning("Phase 2 upgrade failed: %s", e)
    else:
        logger.info("Phase 2 seed skipped (set ENABLE_PHASE2=true to enable)")

    # 3) External auditor user
    if not await db.users.find_one({"email": "external.auditor@bigfour.example"}, {"_id": 0}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "external.auditor@bigfour.example",
            "full_name": "Hannah Oduya",
            "role": "External Auditor",
            "entity": "US-HQ",
            "password_hash": hash_password("demo1234"),
            "status": "active",
            "created_at": iso(datetime.now(timezone.utc)),
        })
        logger.info("Upserted external auditor user")

    await get_notif_settings(db)

    # 5) First-time: run all controls + auto-create top-8 cases
    if not await db.exceptions.count_documents({}):
        out = await run_all_controls(db)
        logger.info("Initial control run: %s exceptions generated", out["total_exceptions"])
        owner_map = {
            "Procure-to-Pay": "ap.clerk@onetouch.ai",
            "Record-to-Report": "gl.lead@onetouch.ai",
            "Access/SoD": "compliance@onetouch.ai",
            "Treasury": "controller@onetouch.ai",
            "Tax": "compliance@onetouch.ai",
            "Order-to-Cash": "controller@onetouch.ai",
            "Payroll": "compliance@onetouch.ai",
            "Fixed Assets": "gl.lead@onetouch.ai",
        }
        critical = [e async for e in db.exceptions.find(
            {"severity": {"$in": ["critical", "high"]}}, {"_id": 0}
        ).sort("financial_exposure", -1).limit(8)]
        for ex in critical:
            owner_email = owner_map.get(ex["process"], "owner@onetouch.ai")
            owner = await db.users.find_one({"email": owner_email}, {"_id": 0})
            case = case_from_exception(ex, owner_email, owner["full_name"] if owner else None)
            await db.cases.insert_one(dict(case))
            await db.exceptions.update_one({"id": ex["id"]}, {"$set": {"status": "in_progress"}})
            await db.case_status_history.insert_one({
                "id": str(uuid.uuid4()), "case_id": case["id"],
                "old_status": None, "new_status": "open",
                "changed_by_user_email": "system",
                "changed_at": iso(datetime.now(timezone.utc)),
            })

    try:
        from app.anomaly import recalibrate_anomaly_scores  # local import: sklearn/num stack only at startup

        anomaly_result = await recalibrate_anomaly_scores(db)
        logger.info("Anomaly recalibration: %s", anomaly_result)
    except Exception as e:  # noqa: BLE001
        logger.warning("Anomaly recalibration failed: %s", e)

    try:
        from app.vector_store import INDEX as vector_index  # local import: sklearn only at startup

        indexed = await vector_index.rebuild(db)
        logger.info("Vector index built: %s documents", indexed)
    except Exception as e:  # noqa: BLE001
        logger.warning("Vector index build failed: %s", e)

    # Semantic embeddings index: light-weight hash provider by default.
    try:
        if await db.embedding_chunks.count_documents({}) == 0:
            from app.embeddings.indexer import rebuild_embedding_index

            out = await rebuild_embedding_index(db, scope=None)
            logger.info("Embedding index built: %s", out)
    except Exception as e:  # noqa: BLE001
        logger.warning("Embedding index build failed: %s", e)

    try:
        async def _sla_job() -> None:
            await scan_sla_breaches(db)

        async def _brief_job() -> None:
            await send_daily_brief(db)

        sched = AsyncIOScheduler()
        sched.add_job(_sla_job, "interval", minutes=5, id="sla_scan", replace_existing=True)
        settings = await get_notif_settings(db)
        hour = int(settings.get("daily_brief_hour_utc", 8))
        sched.add_job(_brief_job, "cron", hour=hour, minute=0, id="daily_brief", replace_existing=True)
        sched.start()
        scheduler = sched
        logger.info("Scheduler started: SLA every 5 min + Daily CFO brief at %02d:00 UTC", hour)
    except Exception as e:  # noqa: BLE001
        logger.warning("Scheduler start failed: %s", e)

    try:
        await scan_sla_breaches(db)
    except Exception as e:  # noqa: BLE001
        logger.warning("Initial SLA scan failed: %s", e)


async def on_shutdown() -> None:
    global scheduler  # noqa: PLW0602
    if scheduler is not None:
        try:
            scheduler.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
    client.close()
