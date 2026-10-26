"""Routers package for SmartQMS."""

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

__all__ = [
    "auth",
    "users",
    "projects",
    "quality_plans",
    "quality_objectives",
    "requirements",
    "reviews",
    "tasks",
    "tests",
    "defects",
    "releases",
    "capas",
    "metrics",
    "reports",
    "audit",
    "traceability"
]
