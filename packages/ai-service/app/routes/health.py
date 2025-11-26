"""Health check endpoints."""
import logging
from fastapi import APIRouter
from app.models.responses import HealthResponse
from app.config import settings
from app.clients.openai_client import openai_client
from app.clients.redis_client import redis_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns service status and dependency health.
    """
    logger.info("Health check requested")
    
    # Check OpenAI status
    openai_status = "healthy" if openai_client.check_health() else "unhealthy"
    
    # Check Redis status
    redis_status = "healthy" if await redis_client.check_health() else "unhealthy"
    
    overall_status = "healthy" if openai_status == "healthy" else "degraded"
    
    return HealthResponse(
        status=overall_status,
        service=settings.service_name,
        version=settings.service_version,
        openai_status=openai_status,
        redis_status=redis_status
    )


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint.
    
    Returns 200 if service is ready to accept requests.
    """
    return {"ready": True}


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint.
    
    Returns 200 if service is alive.
    """
    return {"alive": True}
