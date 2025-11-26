"""OpenAI API client with error handling."""
import logging
from typing import Optional, List, Dict, Any
from openai import OpenAI, OpenAIError, APIError, RateLimitError, APIConnectionError
import time
from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIClient:
    """Wrapper for OpenAI API with error handling and retry logic."""
    
    def __init__(self):
        """Initialize OpenAI client."""
        if not settings.openai_api_key:
            logger.warning("OpenAI API key not configured")
        
        self.client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout
        )
        self.model = settings.openai_model
        self.temperature = settings.openai_temperature
        self.max_tokens = settings.openai_max_tokens
        self.max_retries = settings.max_retries
        self.retry_delay = settings.retry_delay
    
    async def create_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Any:
        """
        Create a chat completion with retry logic.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens in response
            stream: Whether to stream the response
            
        Returns:
            OpenAI completion response
            
        Raises:
            OpenAIError: If API call fails after retries
        """
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Creating completion (attempt {attempt + 1}/{self.max_retries})")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=tokens,
                    stream=stream
                )
                
                logger.info("Completion created successfully")
                return response
                
            except RateLimitError as e:
                logger.warning(f"Rate limit exceeded: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Max retries reached for rate limit")
                    raise
                    
            except APIConnectionError as e:
                logger.error(f"Connection error: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Max retries reached for connection error")
                    raise
                    
            except APIError as e:
                logger.error(f"API error: {e}")
                if attempt < self.max_retries - 1 and e.status_code >= 500:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error("Non-retryable API error or max retries reached")
                    raise
                    
            except OpenAIError as e:
                logger.error(f"OpenAI error: {e}")
                raise
                
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                raise
        
        raise OpenAIError("Failed to create completion after all retries")
    
    def check_health(self) -> bool:
        """
        Check if OpenAI API is accessible.
        
        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Simple test call
            self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


# Global client instance
openai_client = OpenAIClient()
