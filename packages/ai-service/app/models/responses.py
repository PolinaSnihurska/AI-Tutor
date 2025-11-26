"""Response models for API endpoints."""
from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field


class Example(BaseModel):
    """Example in an explanation."""
    
    title: str = Field(..., description="Example title")
    content: str = Field(..., description="Example content")


class Explanation(BaseModel):
    """Response model for topic explanation."""
    
    content: str = Field(..., description="Main explanation content")
    examples: List[Example] = Field(default_factory=list, description="Examples")
    related_topics: List[str] = Field(default_factory=list, description="Related topics")
    difficulty: int = Field(..., ge=1, le=10, description="Difficulty level (1-10)")
    estimated_read_time: int = Field(..., ge=1, description="Estimated read time in minutes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "The Pythagorean theorem states that in a right triangle...",
                "examples": [
                    {
                        "title": "Basic Example",
                        "content": "If a = 3 and b = 4, then c = 5"
                    }
                ],
                "related_topics": ["Right triangles", "Distance formula"],
                "difficulty": 5,
                "estimated_read_time": 3
            }
        }


class GeneratedQuestion(BaseModel):
    """A generated test question."""
    
    id: str = Field(..., description="Question ID")
    type: Literal['multiple_choice', 'true_false', 'open_ended'] = Field(..., description="Question type")
    content: str = Field(..., description="Question content")
    options: Optional[List[str]] = Field(None, description="Answer options (for multiple choice/true-false)")
    correct_answer: Union[str, List[str]] = Field(..., description="Correct answer(s)")
    explanation: str = Field(..., description="Explanation of the correct answer")
    difficulty: int = Field(..., ge=1, le=10, description="Difficulty level")
    topic: str = Field(..., description="Topic this question covers")
    points: int = Field(default=1, description="Points for this question")


class GeneratedTest(BaseModel):
    """Response model for test generation."""
    
    title: str = Field(..., description="Test title")
    subject: str = Field(..., description="Subject area")
    topics: List[str] = Field(..., description="Topics covered")
    questions: List[GeneratedQuestion] = Field(..., description="Generated questions")
    time_limit: Optional[int] = Field(None, description="Suggested time limit in minutes")
    passing_score: int = Field(..., description="Suggested passing score percentage")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Mathematics: Pythagorean Theorem Test",
                "subject": "Mathematics",
                "topics": ["Pythagorean theorem", "Right triangles"],
                "questions": [
                    {
                        "id": "q1",
                        "type": "multiple_choice",
                        "content": "What is the Pythagorean theorem?",
                        "options": ["a² + b² = c²", "a + b = c", "a² - b² = c²", "ab = c"],
                        "correct_answer": "a² + b² = c²",
                        "explanation": "The Pythagorean theorem states...",
                        "difficulty": 3,
                        "topic": "Pythagorean theorem",
                        "points": 1
                    }
                ],
                "time_limit": 30,
                "passing_score": 70
            }
        }


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    openai_status: str = Field(..., description="OpenAI API status")
    redis_status: str = Field(..., description="Redis status")


class ErrorResponse(BaseModel):
    """Error response model."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[dict] = Field(None, description="Additional error details")
