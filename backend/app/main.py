import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.models.user import User
from app.seed import seed_database
from app.routers import (
    auth,
    users,
    projects,
    quality_plans,
    quality_objectives,
    requirements,
    reviews,
    tasks,
    tests,
    defects,
    releases,
    capas,
    metrics,
    reports,
    audit,
    traceability
)
from app.core.dependencies import require_roles
from app.database.init_db import init_db

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database.connection import SessionLocal
    db = SessionLocal()
    try:
        init_db(drop_all=False, session=db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Software Quality Management Platform for Development Teams. Software Quality. Verified at Every Stage.",
    lifespan=lifespan,
)

# CORS Middleware (allows localhost, 127.0.0.1, and all Render / custom domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(quality_plans.router)
app.include_router(quality_objectives.router)
app.include_router(requirements.router)
app.include_router(reviews.router)
app.include_router(tasks.router)
app.include_router(tests.router)
app.include_router(defects.router)
app.include_router(releases.router)
app.include_router(capas.router)
app.include_router(metrics.router)
app.include_router(reports.router)
app.include_router(audit.router)
app.include_router(traceability.router)


@app.post("/api/system/reseed")
def api_reseed_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "quality_manager"]))
):
    """
    Reseeds the database with verified e-commerce quality baseline data.
    """
    seed_database(db)
    return {"message": "Database successfully restored to verified e-commerce quality baseline."}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "product": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION
    }

# Serve built frontend SPA if present (supports unified single-service full-stack deployment on Render)
def get_frontend_dist() -> Path | None:
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
        Path("frontend/dist").resolve(),
        Path("../frontend/dist").resolve(),
    ]
    for c in candidates:
        if c.exists() and (c / "index.html").exists():
            return c
    return None

frontend_dist = get_frontend_dist()
if frontend_dist:
    assets_path = frontend_dist / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Do not intercept API, swagger, or OpenAPI routes
        if full_path.startswith("api") or full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
