"""Evidence graph, copilot, drill, insights, anomaly, vector store endpoints."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.deps import db, audit_log
from app.models import EvidenceGraph, CopilotAskRequest, CopilotAnswer
from app.analytics import evidence_graph
from app.copilot import ask_copilot
from app.drill import drill
from app.insights import get_insights as insights_get, SECTIONS as INSIGHT_SECTIONS

router = APIRouter(tags=["evidence-ai"])


@router.get("/evidence/{exception_id}", response_model=EvidenceGraph)
async def evidence(exception_id: str, current=Depends(get_current_user)):
    from app.services import legal_hold_service as ghs
    from app.services import worm_service as ws

    graph = await evidence_graph(db, exception_id)
    on_hold = await ghs.is_held(db, "evidence", exception_id)
    worm, _ = await ws.is_worm_locked(db, ws.REF_EVIDENCE, exception_id)
    return {
        **graph,
        "governance": {"legal_hold": on_hold, "worm": worm},
    }


@router.post("/copilot/ask", response_model=CopilotAnswer)
async def copilot_ask(body: CopilotAskRequest, current=Depends(get_current_user)):
    out = await ask_copilot(db, body.question, current["email"], body.session_id)
    await audit_log(current["email"], "copilot_ask", "copilot_session", out["session_id"], {"q": body.question})
    return out


@router.get("/copilot/sessions")
async def copilot_sessions(limit: int = 30, current=Depends(get_current_user)):
    return [s async for s in db.copilot_sessions.find(
        {"user_email": current["email"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)]


@router.post("/copilot/rebuild-index")
async def copilot_rebuild_index(current=Depends(get_current_user)):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot rebuild indices")
    from app.services.governance_approval_service import require_approval_or_raise
    await require_approval_or_raise(db, action="copilot_rebuild_index", subject_type="copilot", subject_id="index")
    # Prefer semantic embeddings index rebuild; TF-IDF remains as fallback.
    from app.embeddings.indexer import rebuild_embedding_index

    out = await rebuild_embedding_index(db, scope=None)
    await audit_log(current["email"], "rebuild_index", "embedding_index", out["run_id"], out)
    # Backward compatible response for legacy tests/clients
    return {**out, "indexed_docs": out.get("chunks_indexed", 0)}


@router.post("/copilot/reindex-scope")
async def copilot_reindex_scope(
    body: Dict[str, Any],
    current=Depends(get_current_user),
):
    if current["role"] == "External Auditor":
        raise HTTPException(403, "Read-only auditor role cannot rebuild indices")
    from app.services.governance_approval_service import require_approval_or_raise
    await require_approval_or_raise(db, action="copilot_rebuild_index", subject_type="copilot", subject_id="index")
    from app.embeddings.indexer import rebuild_embedding_index

    scope = body.get("scope") or {}
    out = await rebuild_embedding_index(db, scope=scope)
    await audit_log(current["email"], "reindex_scope", "embedding_index", out["run_id"], {"scope": scope, **out})
    return {**out, "indexed_docs": out.get("chunks_indexed", 0)}


@router.get("/copilot/retrieval-configs")
async def copilot_retrieval_configs(current=Depends(get_current_user)):
    return [c async for c in db.retrieval_config_versions.find({}, {"_id": 0}).sort("created_at", -1).limit(20)]


@router.get("/copilot/index-status")
async def copilot_index_status(current=Depends(get_current_user)):
    emb_count = await db.embedding_chunks.count_documents({})
    last_run = [r async for r in db.embedding_index_runs.find({}, {"_id": 0}).sort("started_at", -1).limit(1)]
    # Backward compatible shape expected by iteration2 tests
    return {
        "indexed_docs": emb_count,
        "matrix_shape": [emb_count, 64],
        "algorithm": "Semantic embeddings (hash-v1) with TF-IDF fallback",
        "semantic": {"chunks": emb_count, "last_run": last_run[0] if last_run else None, "provider": "hash-v1"},
        "legacy_tfidf": {"enabled": True, "note": "Fallback only (requires sklearn runtime)"},
    }


@router.post("/anomaly/recalibrate")
async def anomaly_recalibrate(current=Depends(get_current_user)):
    if current["role"] not in ("CFO", "Controller", "Internal Auditor"):
        raise HTTPException(403, "Insufficient permissions")
    from app.anomaly import recalibrate_anomaly_scores  # local: optional numeric stack

    result = await recalibrate_anomaly_scores(db)
    await audit_log(current["email"], "recalibrate_anomaly", "system", "anomaly", result)
    return result


@router.get("/drill/{type_}/{id_:path}")
async def drill_endpoint(type_: str, id_: str, current=Depends(get_current_user)):
    result = await drill(db, type_, id_)
    if result.get("error") == "not_found":
        raise HTTPException(404, f"{type_} '{id_}' not found")
    if result.get("error") == "unknown_type":
        raise HTTPException(400, f"Unknown drill type: {type_}")
    return result


@router.get("/insights/{section}")
async def insights_endpoint(section: str, refresh: bool = False, current=Depends(get_current_user)):
    if section not in INSIGHT_SECTIONS:
        raise HTTPException(400, f"Unknown section. Supported: {', '.join(INSIGHT_SECTIONS.keys())}")
    if current["role"] == "External Auditor" and section not in ("evidence", "audit"):
        raise HTTPException(403, "Read-only auditor role cannot access this insight section")
    result = await insights_get(db, section, current["email"], current["role"], force_refresh=refresh)
    if result.get("error"):
        raise HTTPException(400, result["error"])
    return result
