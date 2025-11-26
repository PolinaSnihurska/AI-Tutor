"""Service for generating explanations."""
import logging
import hashlib
import json
import re
from typing import Optional, List, Dict, Any
from app.clients.openai_client import openai_client
from app.clients.redis_client import redis_client
from app.prompts.prompt_manager import prompt_manager
from app.models.requests import ExplanationRequest
from app.models.responses import Explanation, Example

logger = logging.getLogger(__name__)


class ExplanationService:
    """Service for generating AI-powered explanations."""
    
    def __init__(self):
        """Initialize explanation service."""
        self.cache_enabled = True
    
    def _generate_cache_key(self, request: ExplanationRequest) -> str:
        """
        Generate a cache key for an explanation request.
        
        Args:
            request: Explanation request
            
        Returns:
            Cache key string
        """
        # Create a deterministic key from request parameters
        key_data = {
            "topic": request.topic.lower().strip(),
            "subject": request.subject.lower().strip(),
            "level": request.student_level,
            "context": request.context.lower().strip() if request.context else ""
        }
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f"explanation:{key_hash}"
    
    async def get_explanation(
        self,
        request: ExplanationRequest,
        use_cache: bool = True
    ) -> Explanation:
        """
        Generate an explanation for a topic.
        
        Args:
            request: Explanation request with topic, subject, and student level
            use_cache: Whether to use cached responses (default: True)
            
        Returns:
            Explanation object with content, examples, and metadata
        """
        # Check cache first
        if use_cache and self.cache_enabled:
            cache_key = self._generate_cache_key(request)
            cached = await redis_client.get(cache_key)
            
            if cached:
                logger.info(f"Cache hit for topic: {request.topic}")
                return Explanation(**cached)
        
        # Generate new explanation
        logger.info(f"Generating explanation for topic: {request.topic}")
        
        # Format prompt
        messages = prompt_manager.format_explanation_prompt(
            topic=request.topic,
            subject=request.subject,
            student_level=request.student_level,
            context=request.context
        )
        
        # Call OpenAI API
        response = await openai_client.create_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract content
        content = response.choices[0].message.content
        
        # Parse the response into structured format
        explanation = self._parse_explanation(content, request.student_level)
        
        # Cache the result
        if use_cache and self.cache_enabled:
            cache_key = self._generate_cache_key(request)
            await redis_client.set(cache_key, explanation.model_dump())
            logger.info(f"Cached explanation for topic: {request.topic}")
        
        return explanation
    
    def _parse_explanation(self, content: str, student_level: int) -> Explanation:
        """
        Parse AI response into structured Explanation object.
        
        Args:
            content: Raw AI response content
            student_level: Student grade level
            
        Returns:
            Structured Explanation object
        """
        # Extract examples if present
        examples = self._extract_examples(content)
        
        # Extract related topics
        related_topics = self._extract_related_topics(content)
        
        # Calculate difficulty based on student level
        difficulty = min(10, max(1, student_level))
        
        # Estimate read time (rough: 200 words per minute)
        word_count = len(content.split())
        estimated_read_time = max(1, round(word_count / 200))
        
        return Explanation(
            content=content,
            examples=examples,
            related_topics=related_topics,
            difficulty=difficulty,
            estimated_read_time=estimated_read_time
        )
    
    def _extract_examples(self, content: str) -> List[Example]:
        """
        Extract examples from explanation content.
        
        Args:
            content: Explanation content
            
        Returns:
            List of Example objects
        """
        examples = []
        
        # Look for example patterns
        example_patterns = [
            r"Example \d+:?\s*([^\n]+)\n([^E]+?)(?=Example \d+|$)",
            r"\*\*Example:?\*\*\s*([^\n]+)\n([^*]+?)(?=\*\*|$)",
        ]
        
        for pattern in example_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                title = match.group(1).strip()
                example_content = match.group(2).strip()
                examples.append(Example(title=title, content=example_content))
        
        # If no structured examples found, create a generic one
        if not examples and "example" in content.lower():
            examples.append(Example(
                title="Example",
                content="See explanation above for examples."
            ))
        
        return examples[:3]  # Limit to 3 examples
    
    def _extract_related_topics(self, content: str) -> List[str]:
        """
        Extract related topics from explanation content.
        
        Args:
            content: Explanation content
            
        Returns:
            List of related topic strings
        """
        related_topics = []
        
        # Look for related topics section
        patterns = [
            r"Related [Tt]opics?:?\s*\n([^\n]+(?:\n[^\n]+)*?)(?=\n\n|$)",
            r"Further [Ll]earning:?\s*\n([^\n]+(?:\n[^\n]+)*?)(?=\n\n|$)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                topics_text = match.group(1)
                # Extract bullet points or numbered items
                topics = re.findall(r"[-•*\d.]\s*([^\n]+)", topics_text)
                related_topics.extend([t.strip() for t in topics])
        
        return related_topics[:5]  # Limit to 5 topics
    
    async def generate_examples(
        self,
        topic: str,
        subject: str,
        student_level: int,
        num_examples: int = 2,
        context: Optional[str] = None
    ) -> List[Example]:
        """
        Generate specific examples for a topic.
        
        Args:
            topic: Topic for examples
            subject: Subject area
            student_level: Student grade level
            num_examples: Number of examples to generate
            context: Additional context
            
        Returns:
            List of Example objects
        """
        logger.info(f"Generating {num_examples} examples for topic: {topic}")
        
        # Format prompt
        messages = prompt_manager.format_example_prompt(
            topic=topic,
            subject=subject,
            student_level=student_level,
            num_examples=num_examples,
            context=context
        )
        
        # Call OpenAI API
        response = await openai_client.create_completion(
            messages=messages,
            temperature=0.8,  # Slightly higher for more creative examples
            max_tokens=1500
        )
        
        content = response.choices[0].message.content
        
        # Parse examples
        examples = self._extract_examples(content)
        
        return examples[:num_examples]


# Global service instance
explanation_service = ExplanationService()
