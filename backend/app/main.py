"""ASGI app factory: routers, middleware, event handlers, exception wiring."""
from __future__ import annotations
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.exceptions import register_exception_handlers
from app.core.logging_config import configure_logging
from app.lifecycle import on_shutdown, on_startup
from app.middleware.stack import CorrelationErrorMiddleware
from app.routers.auth_router import router as auth_router
from app.routers.dashboards_router import router as dashboards_router
from app.routers.controls_router import router as controls_router
from app.routers.cases_router import router as cases_router
from app.routers.evidence_ai_router import router as evidence_ai_router
from app.routers.admin_router import router as admin_router
from app.routers.rollups_router import router as rollups_router
from app.routers.retention_router import router as retention_router
from app.routers.legal_holds_router import router as legal_holds_router
from app.routers.connectors_router import router as connectors_router
from app.routers.dq_router import router as dq_router
from app.routers.governance_router import router as governance_router


def create_app() -> FastAPI:
    configure_logging()
    application = FastAPI(title="One Touch Audit AI")
    register_exception_handlers(application)
    # Last add_middleware is outer (browser hits CORS first, then correlation + 500 boundary).
    application.add_middleware(CorrelationErrorMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")

    @api.get("/")
    async def health():
        return {"service": "One Touch Audit AI", "status": "ok"}

    for r in (auth_router, dashboards_router, controls_router, cases_router, evidence_ai_router, admin_router,
              rollups_router, retention_router, legal_holds_router, connectors_router, dq_router, governance_router):
        api.include_router(r)

    application.include_router(api)
    application.add_event_handler("startup", on_startup)
    application.add_event_handler("shutdown", on_shutdown)
    return application


# Default module export for Uvicorn and importers: ``from app.main import app``
app = create_app()
