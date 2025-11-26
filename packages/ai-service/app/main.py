"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError
import os

from app.config import settings
from app.logging_config import logger
from app.clients.redis_client import redis_client
from app.routes import health_router, learning_plans_router
from app.routes.explanations import router as explanations_router
from app.routes.tests import router as tests_router
from app.monitoring import (
    initialize_sentry,
    metrics_middleware,
    get_metrics,
    health_check,
    readiness_check,
    liveness_check,
)

# Initialize Sentry
initialize_sentry(os.getenv('SENTRY_DSN'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    logger.info(f"Environment: {settings.environment}")
    
    # Connect to Redis
    await redis_client.connect()
    
    yield
    
    # Shutdown
    logger.info("Shutting down service")
    await redis_client.disconnect()


# Create FastAPI app
app = FastAPI(
    title="AI Tutoring Service",
    description="AI-powered explanation and content generation service",
    version=settings.service_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Metrics middleware
app.middleware("http")(metrics_middleware)


# Exception handlers
@app.exception_handler(OpenAIError)
async def openai_exception_handler(request: Request, exc: OpenAIError):
    """Handle OpenAI API errors."""
    logger.error(f"OpenAI error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "AI_SERVICE_ERROR",
            "message": "AI service is temporarily unavailable",
            "details": {"type": type(exc).__name__}
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "details": {"type": type(exc).__name__}
        }
    )


# Health and monitoring endpoints
@app.get("/health")
async def health():
    """Health check endpoint."""
    return await health_check()


@app.get("/ready")
async def ready():
    """Readiness probe."""
    return await readiness_check()


@app.get("/live")
async def live():
    """Liveness probe."""
    return await liveness_check()


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return await get_metrics()


# Include routers
app.include_router(health_router)
app.include_router(explanations_router)
app.include_router(tests_router)
app.include_router(learning_plans_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running"
    }
