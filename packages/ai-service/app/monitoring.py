"""
Monitoring and observability utilities for AI service
"""
import time
import logging
from typing import Dict, Any, Callable
from functools import wraps
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse
import psutil
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

ai_generation_duration_seconds = Histogram(
    'ai_generation_duration_seconds',
    'AI content generation duration in seconds',
    ['operation_type'],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

ai_generation_total = Counter(
    'ai_generation_total',
    'Total AI generation requests',
    ['operation_type', 'status']
)

cache_operations_total = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result']
)

active_requests = Gauge(
    'active_requests',
    'Number of active requests'
)

openai_api_calls_total = Counter(
    'openai_api_calls_total',
    'Total OpenAI API calls',
    ['model', 'status']
)

openai_tokens_used_total = Counter(
    'openai_tokens_used_total',
    'Total OpenAI tokens used',
    ['model', 'type']
)


def initialize_sentry(dsn: str = None):
    """Initialize Sentry for error tracking"""
    if not dsn:
        logger.warning("Sentry DSN not provided, error tracking disabled")
        return
    
    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv('ENVIRONMENT', 'development'),
        integrations=[
            FastApiIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1 if os.getenv('ENVIRONMENT') == 'production' else 1.0,
        profiles_sample_rate=0.1 if os.getenv('ENVIRONMENT') == 'production' else 1.0,
    )
    logger.info("Sentry initialized successfully")


async def metrics_middleware(request: Request, call_next):
    """Middleware to track request metrics"""
    active_requests.inc()
    start_time = time.time()
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Track metrics
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code
        ).inc()
        
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=500
        ).inc()
        
        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        raise
    finally:
        active_requests.dec()


def track_ai_generation(operation_type: str):
    """Decorator to track AI generation metrics"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = 'success'
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                sentry_sdk.capture_exception(e)
                raise
            finally:
                duration = time.time() - start_time
                ai_generation_duration_seconds.labels(
                    operation_type=operation_type
                ).observe(duration)
                
                ai_generation_total.labels(
                    operation_type=operation_type,
                    status=status
                ).inc()
        
        return wrapper
    return decorator


def track_cache_operation(operation: str, result: str):
    """Track cache operation metrics"""
    cache_operations_total.labels(
        operation=operation,
        result=result
    ).inc()


def track_openai_usage(model: str, status: str, prompt_tokens: int = 0, completion_tokens: int = 0):
    """Track OpenAI API usage"""
    openai_api_calls_total.labels(
        model=model,
        status=status
    ).inc()
    
    if prompt_tokens > 0:
        openai_tokens_used_total.labels(
            model=model,
            type='prompt'
        ).inc(prompt_tokens)
    
    if completion_tokens > 0:
        openai_tokens_used_total.labels(
            model=model,
            type='completion'
        ).inc(completion_tokens)


async def get_metrics():
    """Get Prometheus metrics"""
    return PlainTextResponse(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


async def health_check() -> Dict[str, Any]:
    """Perform health check"""
    checks = {}
    overall_status = 'healthy'
    
    # Check memory usage
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    if memory_percent > 90:
        checks['memory'] = {
            'status': 'fail',
            'message': f'High memory usage: {memory_percent:.2f}%'
        }
        overall_status = 'unhealthy'
    else:
        checks['memory'] = {
            'status': 'pass',
            'message': f'Memory usage: {memory_percent:.2f}%'
        }
    
    # Check CPU usage
    cpu_percent = psutil.cpu_percent(interval=0.1)
    
    if cpu_percent > 90:
        checks['cpu'] = {
            'status': 'fail',
            'message': f'High CPU usage: {cpu_percent:.2f}%'
        }
        overall_status = 'degraded' if overall_status == 'healthy' else 'unhealthy'
    else:
        checks['cpu'] = {
            'status': 'pass',
            'message': f'CPU usage: {cpu_percent:.2f}%'
        }
    
    # Check disk usage
    disk = psutil.disk_usage('/')
    disk_percent = disk.percent
    
    if disk_percent > 90:
        checks['disk'] = {
            'status': 'fail',
            'message': f'High disk usage: {disk_percent:.2f}%'
        }
        overall_status = 'degraded' if overall_status == 'healthy' else 'unhealthy'
    else:
        checks['disk'] = {
            'status': 'pass',
            'message': f'Disk usage: {disk_percent:.2f}%'
        }
    
    return {
        'status': overall_status,
        'timestamp': time.time(),
        'service': 'ai-service',
        'version': '1.0.0',
        'uptime': time.time() - psutil.boot_time(),
        'checks': checks
    }


async def readiness_check() -> Dict[str, str]:
    """Readiness probe"""
    # Check if service can handle requests
    try:
        # Add any necessary checks (e.g., OpenAI API connectivity)
        return {'status': 'ready'}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {'status': 'not ready', 'error': str(e)}


async def liveness_check() -> Dict[str, str]:
    """Liveness probe"""
    return {'status': 'alive'}
