from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.embeddings.providers import EmbeddingProvider, HashEmbeddingProvider
from app.utils.timeutil import iso_utc


def _chunk_text(text: str, *, max_chars: int = 900) -> List[str]:
    t = (text or "").strip()
    if not t:
        return []
    if len(t) <= max_chars:
        return [t]
    chunks = []
    i = 0
    while i < len(t):
        chunks.append(t[i : i + max_chars])
        i += max_chars
    return chunks


async def build_corpus(db, scope: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Return list of source items: {source_type, source_id, label, text, entity?, process?}."""
    scope = scope or {}
    out: List[Dict[str, Any]] = []
    # controls
    async for c in db.controls.find({}, {"_id": 0}):
        out.append(
            {
                "source_type": "control",
                "source_id": c["code"],
                "label": f"{c['code']} · {c['name']}",
                "text": f"Control {c['code']} {c['name']} — {c['description']} Process={c['process']} Risk={c['risk']} Criticality={c['criticality']} Framework={c.get('framework','')}",
                "entity": None,
                "process": c.get("process"),
            }
        )
    # exceptions
    q: Dict[str, Any] = {}
    if scope.get("entity"):
        q["entity"] = scope["entity"]
    if scope.get("process"):
        q["process"] = scope["process"]
    async for ex in db.exceptions.find(q, {"_id": 0}).limit(2000):
        out.append(
            {
                "source_type": "exception",
                "source_id": ex["id"],
                "label": f"EX-{ex['id'][:6]} · {ex['control_code']}",
                "text": f"Exception [{ex['severity'].upper()}] on {ex['control_code']} ({ex['control_name']}) "
                f"entity={ex['entity']} process={ex['process']} exposure=${ex['financial_exposure']:,.2f} "
                f"anomaly={ex['anomaly_score']} — {ex['title']}. {ex['summary']}",
                "entity": ex.get("entity"),
                "process": ex.get("process"),
            }
        )
    # policies
    async for p in db.policies.find({}, {"_id": 0}):
        out.append(
            {
                "source_type": "policy",
                "source_id": p["id"],
                "label": p["title"],
                "text": f"Policy '{p['title']}' effective {p['effective_date']}. Clauses: {' | '.join(p.get('clauses', []))}",
                "entity": None,
                "process": None,
            }
        )
    # cases
    cq: Dict[str, Any] = {}
    if scope.get("entity"):
        cq["entity"] = scope["entity"]
    if scope.get("process"):
        cq["process"] = scope["process"]
    async for ca in db.cases.find(cq, {"_id": 0}).limit(1000):
        out.append(
            {
                "source_type": "case",
                "source_id": ca["id"],
                "label": f"CASE-{ca['id'][:6]}",
                "text": f"Case status={ca['status']} priority={ca['priority']} owner={ca['owner_email']} "
                f"severity={ca['severity']} exposure=${ca['financial_exposure']:,.2f} — {ca['title']} {ca.get('summary','')}",
                "entity": ca.get("entity"),
                "process": ca.get("process"),
            }
        )
    return out


async def rebuild_embedding_index(
    db,
    *,
    scope: Optional[Dict[str, Any]] = None,
    provider: Optional[EmbeddingProvider] = None,
) -> Dict[str, Any]:
    provider = provider or HashEmbeddingProvider()
    now = iso_utc(datetime.now(timezone.utc))
    run_id = f"eir-{uuid.uuid4().hex[:10]}"

    await db.embedding_index_runs.insert_one(
        {
            "id": run_id,
            "provider": provider.name,
            "dim": provider.dim,
            "scope": scope or {},
            "status": "running",
            "started_at": now,
            "ended_at": None,
            "chunks_indexed": 0,
            "sources_indexed": 0,
        }
    )

    if scope:
        # scoped rebuild: delete only matching chunks by metadata
        await db.embedding_chunks.delete_many({"metadata.entity": scope.get("entity"), "metadata.process": scope.get("process")})
    else:
        await db.embedding_chunks.delete_many({})

    sources = await build_corpus(db, scope=scope)
    texts: List[str] = []
    metas: List[Dict[str, Any]] = []
    for s in sources:
        for i, ch in enumerate(_chunk_text(s["text"])):
            texts.append(ch)
            metas.append(
                {
                    "source_type": s["source_type"],
                    "source_id": s["source_id"],
                    "label": s["label"],
                    "chunk_index": i,
                    "entity": s.get("entity"),
                    "process": s.get("process"),
                }
            )
    vecs = await provider.embed(texts) if texts else []

    chunk_docs = []
    for t, v, m in zip(texts, vecs, metas):
        chunk_docs.append(
            {
                "id": f"ech-{uuid.uuid4().hex[:12]}",
                "text": t,
                "vector": v,
                "provider": provider.name,
                "dim": provider.dim,
                "metadata": m,
                "created_at": now,
            }
        )
    if chunk_docs:
        await db.embedding_chunks.insert_many(chunk_docs)

    end = iso_utc(datetime.now(timezone.utc))
    await db.embedding_index_runs.update_one(
        {"id": run_id},
        {"$set": {"status": "success", "ended_at": end, "chunks_indexed": len(chunk_docs), "sources_indexed": len(sources)}},
    )
    return {"run_id": run_id, "provider": provider.name, "dim": provider.dim, "chunks_indexed": len(chunk_docs), "sources_indexed": len(sources)}

