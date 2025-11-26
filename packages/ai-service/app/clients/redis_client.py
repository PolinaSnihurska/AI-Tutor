"""Redis client for caching."""
import logging
import json
from typing import Optional, Any
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client for caching AI responses."""
    
    def __init__(self):
        """Initialize Redis client."""
        self.redis: Optional[redis.Redis] = None
        self.cache_ttl = settings.redis_cache_ttl
    
    async def connect(self):
        """Connect to Redis."""
        try:
            self.redis = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis.ping()
            logger.info("Connected to Redis successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                logger.debug(f"Cache hit for key: {key}")
                return json.loads(value)
            logger.debug(f"Cache miss for key: {key}")
            return None
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: settings.redis_cache_ttl)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False
        
        try:
            ttl = ttl if ttl is not None else self.cache_ttl
            await self.redis.setex(key, ttl, json.dumps(value))
            logger.debug(f"Cached value for key: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Error setting cache: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        if not self.redis:
            return False
        
        try:
            await self.redis.delete(key)
            logger.debug(f"Deleted cache key: {key}")
            return True
        except Exception as e:
            logger.error(f"Error deleting from cache: {e}")
            return False
    
    async def check_health(self) -> bool:
        """
        Check if Redis is accessible.
        
        Returns:
            True if accessible, False otherwise
        """
        if not self.redis:
            return False
        
        try:
            await self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()
