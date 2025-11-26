"""Cache invalidation strategies for AI service."""
import logging
from typing import Optional, List
from app.clients.redis_client import redis_client

logger = logging.getLogger(__name__)


class CacheInvalidationService:
    """Service for managing cache invalidation strategies."""
    
    async def invalidate_explanation(self, topic: str, subject: str) -> int:
        """
        Invalidate cached explanations for a specific topic.
        
        Args:
            topic: Topic to invalidate
            subject: Subject area
            
        Returns:
            Number of keys deleted
        """
        if not redis_client.redis:
            return 0
        
        try:
            # Find all explanation keys for this topic/subject
            pattern = f"explanation:*{topic.lower()}*{subject.lower()}*"
            keys = await redis_client.redis.keys(pattern)
            
            if keys:
                deleted = await redis_client.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} explanation caches for {topic}/{subject}")
                return deleted
            
            return 0
        except Exception as e:
            logger.error(f"Error invalidating explanation cache: {e}")
            return 0
    
    async def invalidate_test_templates(self, subject: Optional[str] = None) -> int:
        """
        Invalidate cached test templates.
        
        Args:
            subject: Optional subject to filter by
            
        Returns:
            Number of keys deleted
        """
        if not redis_client.redis:
            return 0
        
        try:
            pattern = f"test:*{subject.lower()}*" if subject else "test:*"
            keys = await redis_client.redis.keys(pattern)
            
            if keys:
                deleted = await redis_client.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} test template caches")
                return deleted
            
            return 0
        except Exception as e:
            logger.error(f"Error invalidating test cache: {e}")
            return 0
    
    async def invalidate_learning_plans(self, student_id: str) -> int:
        """
        Invalidate cached learning plans for a student.
        
        Args:
            student_id: Student ID
            
        Returns:
            Number of keys deleted
        """
        if not redis_client.redis:
            return 0
        
        try:
            pattern = f"learning_plan:{student_id}:*"
            keys = await redis_client.redis.keys(pattern)
            
            if keys:
                deleted = await redis_client.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} learning plan caches for student {student_id}")
                return deleted
            
            return 0
        except Exception as e:
            logger.error(f"Error invalidating learning plan cache: {e}")
            return 0
    
    async def invalidate_all(self) -> int:
        """
        Invalidate all caches (use with caution).
        
        Returns:
            Number of keys deleted
        """
        if not redis_client.redis:
            return 0
        
        try:
            # Get all keys with our prefixes
            patterns = ["explanation:*", "test:*", "learning_plan:*"]
            total_deleted = 0
            
            for pattern in patterns:
                keys = await redis_client.redis.keys(pattern)
                if keys:
                    deleted = await redis_client.redis.delete(*keys)
                    total_deleted += deleted
            
            logger.info(f"Invalidated {total_deleted} total cache entries")
            return total_deleted
        except Exception as e:
            logger.error(f"Error invalidating all caches: {e}")
            return 0
    
    async def get_cache_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        if not redis_client.redis:
            return {"available": False}
        
        try:
            # Count keys by type
            explanation_keys = await redis_client.redis.keys("explanation:*")
            test_keys = await redis_client.redis.keys("test:*")
            learning_plan_keys = await redis_client.redis.keys("learning_plan:*")
            
            # Get memory info
            info = await redis_client.redis.info("memory")
            
            return {
                "available": True,
                "explanation_count": len(explanation_keys),
                "test_count": len(test_keys),
                "learning_plan_count": len(learning_plan_keys),
                "total_keys": len(explanation_keys) + len(test_keys) + len(learning_plan_keys),
                "memory_used": info.get("used_memory_human", "unknown"),
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"available": False, "error": str(e)}


# Global service instance
cache_invalidation_service = CacheInvalidationService()
