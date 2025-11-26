"""API routes."""
from app.routes.health import router as health_router
from app.routes.learning_plans import router as learning_plans_router

__all__ = ["health_router", "learning_plans_router"]
