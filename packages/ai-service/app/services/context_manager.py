"""Context management for conversation history."""
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.clients.redis_client import redis_client

logger = logging.getLogger(__name__)


class ConversationContext:
    """Manages conversation context and history."""
    
    def __init__(self, max_messages: int = 10, ttl: int = 3600):
        """
        Initialize context manager.
        
        Args:
            max_messages: Maximum number of messages to keep in context
            ttl: Time to live for conversation context in seconds (default: 1 hour)
        """
        self.max_messages = max_messages
        self.ttl = ttl
    
    def _get_context_key(self, user_id: str, conversation_id: str) -> str:
        """Generate Redis key for conversation context."""
        return f"conversation:{user_id}:{conversation_id}"
    
    async def get_context(
        self,
        user_id: str,
        conversation_id: str
    ) -> List[Dict[str, str]]:
        """
        Retrieve conversation context from cache.
        
        Args:
            user_id: User identifier
            conversation_id: Conversation identifier
            
        Returns:
            List of message dictionaries
        """
        key = self._get_context_key(user_id, conversation_id)
        context = await redis_client.get(key)
        
        if context:
            logger.info(f"Retrieved context for conversation {conversation_id}")
            return context.get("messages", [])
        
        logger.info(f"No context found for conversation {conversation_id}")
        return []
    
    async def add_message(
        self,
        user_id: str,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None
    ):
        """
        Add a message to conversation context.
        
        Args:
            user_id: User identifier
            conversation_id: Conversation identifier
            role: Message role ('user' or 'assistant')
            content: Message content
            metadata: Optional metadata for the message
        """
        key = self._get_context_key(user_id, conversation_id)
        
        # Get existing context
        context = await redis_client.get(key) or {"messages": []}
        messages = context.get("messages", [])
        
        # Add new message
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        messages.append(message)
        
        # Keep only last N messages
        if len(messages) > self.max_messages:
            messages = messages[-self.max_messages:]
        
        # Update context
        context["messages"] = messages
        context["updated_at"] = datetime.utcnow().isoformat()
        
        await redis_client.set(key, context, ttl=self.ttl)
        logger.info(f"Added message to conversation {conversation_id}")
    
    async def clear_context(self, user_id: str, conversation_id: str):
        """
        Clear conversation context.
        
        Args:
            user_id: User identifier
            conversation_id: Conversation identifier
        """
        key = self._get_context_key(user_id, conversation_id)
        await redis_client.delete(key)
        logger.info(f"Cleared context for conversation {conversation_id}")
    
    async def get_recent_topics(
        self,
        user_id: str,
        conversation_id: str
    ) -> List[str]:
        """
        Extract recent topics from conversation context.
        
        Args:
            user_id: User identifier
            conversation_id: Conversation identifier
            
        Returns:
            List of recent topics discussed
        """
        messages = await self.get_context(user_id, conversation_id)
        topics = []
        
        for msg in messages:
            metadata = msg.get("metadata", {})
            if "topic" in metadata:
                topics.append(metadata["topic"])
        
        # Return unique topics, most recent first
        return list(dict.fromkeys(reversed(topics)))


# Global context manager instance
context_manager = ConversationContext()
