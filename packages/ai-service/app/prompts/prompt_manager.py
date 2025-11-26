"""Prompt manager for versioning and A/B testing."""
import logging
from typing import Dict, List, Optional, Any
from enum import Enum
from langchain.prompts import ChatPromptTemplate

from app.prompts.templates import (
    EXPLANATION_TEMPLATE,
    EXAMPLE_GENERATION_TEMPLATE,
    CONVERSATIONAL_TEMPLATE,
    SIMPLIFICATION_TEMPLATE,
    ADVANCED_TEMPLATE,
    get_context_section
)

logger = logging.getLogger(__name__)


class PromptType(str, Enum):
    """Types of prompts available."""
    EXPLANATION = "explanation"
    EXAMPLE_GENERATION = "example_generation"
    CONVERSATIONAL = "conversational"
    SIMPLIFICATION = "simplification"
    ADVANCED = "advanced"


class PromptVersion(str, Enum):
    """Prompt versions for A/B testing."""
    V1 = "v1"
    V2 = "v2"
    LATEST = "latest"


class PromptManager:
    """
    Manages prompt templates with versioning and A/B testing capabilities.
    """
    
    def __init__(self):
        """Initialize prompt manager with templates."""
        self.templates: Dict[str, Dict[str, ChatPromptTemplate]] = {
            PromptType.EXPLANATION: {
                PromptVersion.V1: EXPLANATION_TEMPLATE,
                PromptVersion.LATEST: EXPLANATION_TEMPLATE
            },
            PromptType.EXAMPLE_GENERATION: {
                PromptVersion.V1: EXAMPLE_GENERATION_TEMPLATE,
                PromptVersion.LATEST: EXAMPLE_GENERATION_TEMPLATE
            },
            PromptType.CONVERSATIONAL: {
                PromptVersion.V1: CONVERSATIONAL_TEMPLATE,
                PromptVersion.LATEST: CONVERSATIONAL_TEMPLATE
            },
            PromptType.SIMPLIFICATION: {
                PromptVersion.V1: SIMPLIFICATION_TEMPLATE,
                PromptVersion.LATEST: SIMPLIFICATION_TEMPLATE
            },
            PromptType.ADVANCED: {
                PromptVersion.V1: ADVANCED_TEMPLATE,
                PromptVersion.LATEST: ADVANCED_TEMPLATE
            }
        }
        
        # A/B testing configuration (can be loaded from database/config)
        self.ab_test_config: Dict[str, Dict[str, float]] = {
            PromptType.EXPLANATION: {
                PromptVersion.V1: 1.0  # 100% traffic to v1
            }
        }
    
    def get_template(
        self,
        prompt_type: PromptType,
        version: PromptVersion = PromptVersion.LATEST
    ) -> ChatPromptTemplate:
        """
        Get a prompt template by type and version.
        
        Args:
            prompt_type: Type of prompt to retrieve
            version: Version of the prompt (default: latest)
            
        Returns:
            ChatPromptTemplate for the specified type and version
            
        Raises:
            ValueError: If prompt type or version not found
        """
        if prompt_type not in self.templates:
            raise ValueError(f"Unknown prompt type: {prompt_type}")
        
        if version not in self.templates[prompt_type]:
            logger.warning(f"Version {version} not found for {prompt_type}, using latest")
            version = PromptVersion.LATEST
        
        return self.templates[prompt_type][version]
    
    def select_prompt_for_student(
        self,
        topic: str,
        subject: str,
        student_level: int,
        context: Optional[str] = None
    ) -> tuple[PromptType, ChatPromptTemplate]:
        """
        Select the most appropriate prompt type based on student level.
        
        Args:
            topic: Topic to explain
            subject: Subject area
            student_level: Student grade level (1-12)
            context: Additional context
            
        Returns:
            Tuple of (prompt_type, template)
        """
        # Select prompt type based on student level
        if student_level <= 5:
            prompt_type = PromptType.SIMPLIFICATION
        elif student_level >= 9:
            prompt_type = PromptType.ADVANCED
        else:
            prompt_type = PromptType.EXPLANATION
        
        template = self.get_template(prompt_type)
        logger.info(f"Selected {prompt_type} prompt for grade {student_level}")
        
        return prompt_type, template
    
    def format_explanation_prompt(
        self,
        topic: str,
        subject: str,
        student_level: int,
        context: Optional[str] = None,
        version: PromptVersion = PromptVersion.LATEST
    ) -> List[Dict[str, str]]:
        """
        Format an explanation prompt with the given parameters.
        
        Args:
            topic: Topic to explain
            subject: Subject area
            student_level: Student grade level
            context: Additional context
            version: Prompt version to use
            
        Returns:
            List of formatted messages ready for OpenAI API
        """
        prompt_type, template = self.select_prompt_for_student(
            topic, subject, student_level, context
        )
        
        context_section = get_context_section(context)
        
        messages = template.format_messages(
            topic=topic,
            subject=subject,
            student_level=student_level,
            context_section=context_section
        )
        
        # Convert to OpenAI format
        return [{"role": msg.type, "content": msg.content} for msg in messages]
    
    def format_example_prompt(
        self,
        topic: str,
        subject: str,
        student_level: int,
        num_examples: int = 2,
        context: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Format an example generation prompt.
        
        Args:
            topic: Topic for examples
            subject: Subject area
            student_level: Student grade level
            num_examples: Number of examples to generate
            context: Additional context
            
        Returns:
            List of formatted messages
        """
        template = self.get_template(PromptType.EXAMPLE_GENERATION)
        context_section = get_context_section(context)
        
        messages = template.format_messages(
            topic=topic,
            subject=subject,
            student_level=student_level,
            num_examples=num_examples,
            context_section=context_section
        )
        
        return [{"role": msg.type, "content": msg.content} for msg in messages]
    
    def format_conversational_prompt(
        self,
        question: str,
        conversation_history: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Format a conversational follow-up prompt.
        
        Args:
            question: Current student question
            conversation_history: Previous messages in conversation
            
        Returns:
            List of formatted messages
        """
        # Format conversation history
        history_text = "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in conversation_history[-5:]  # Last 5 messages for context
        ])
        
        template = self.get_template(PromptType.CONVERSATIONAL)
        messages = template.format_messages(
            conversation_history=history_text,
            question=question
        )
        
        return [{"role": msg.type, "content": msg.content} for msg in messages]
    
    def add_template_version(
        self,
        prompt_type: PromptType,
        version: str,
        template: ChatPromptTemplate
    ):
        """
        Add a new version of a prompt template.
        
        Args:
            prompt_type: Type of prompt
            version: Version identifier
            template: The prompt template
        """
        if prompt_type not in self.templates:
            self.templates[prompt_type] = {}
        
        self.templates[prompt_type][version] = template
        logger.info(f"Added {prompt_type} template version {version}")
    
    def configure_ab_test(
        self,
        prompt_type: PromptType,
        version_weights: Dict[str, float]
    ):
        """
        Configure A/B testing weights for a prompt type.
        
        Args:
            prompt_type: Type of prompt
            version_weights: Dictionary mapping versions to traffic weights (0-1)
        """
        total_weight = sum(version_weights.values())
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Version weights must sum to 1.0, got {total_weight}")
        
        self.ab_test_config[prompt_type] = version_weights
        logger.info(f"Configured A/B test for {prompt_type}: {version_weights}")


# Global prompt manager instance
prompt_manager = PromptManager()
