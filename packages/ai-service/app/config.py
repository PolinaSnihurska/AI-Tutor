"""Configuration management for AI Service."""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Service
    service_name: str = "ai-service"
    service_version: str = "1.0.0"
    environment: str = os.getenv("NODE_ENV", "development")
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = "gpt-4"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 2000
    openai_timeout: int = 30
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://:redis@localhost:6379")
    redis_cache_ttl: int = 86400  # 24 hours for explanations
    
    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Rate limiting
    max_retries: int = 3
    retry_delay: float = 1.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
