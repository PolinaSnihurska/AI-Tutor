"""Request models for API endpoints."""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, validator


class ExplanationRequest(BaseModel):
    """Request model for topic explanation."""
    
    topic: str = Field(..., min_length=1, max_length=500, description="Topic to explain")
    subject: str = Field(..., min_length=1, max_length=100, description="Subject area")
    student_level: int = Field(..., ge=1, le=12, description="Student grade level (1-12)")
    context: Optional[str] = Field(None, max_length=2000, description="Additional context")
    previous_explanations: Optional[List[str]] = Field(
        None, 
        max_items=5,
        description="Previous explanations in conversation"
    )
    
    @validator('topic', 'subject')
    def strip_whitespace(cls, v):
        """Strip whitespace from string fields."""
        return v.strip() if v else v
    
    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Pythagorean theorem",
                "subject": "Mathematics",
                "student_level": 8,
                "context": "Student is preparing for geometry exam",
                "previous_explanations": []
            }
        }


class TestGenerationRequest(BaseModel):
    """Request model for test generation."""
    
    subject: str = Field(..., min_length=1, max_length=100, description="Subject area")
    topics: List[str] = Field(..., min_items=1, max_items=10, description="Topics to cover")
    difficulty: int = Field(..., ge=1, le=10, description="Difficulty level (1-10)")
    question_count: int = Field(..., ge=1, le=50, description="Number of questions")
    question_types: List[Literal['multiple_choice', 'true_false', 'open_ended']] = Field(
        default=['multiple_choice'],
        description="Types of questions to generate"
    )
    student_level: Optional[int] = Field(None, ge=1, le=12, description="Student grade level")
    
    @validator('subject')
    def strip_whitespace(cls, v):
        """Strip whitespace from string fields."""
        return v.strip() if v else v
    
    @validator('topics')
    def strip_topics(cls, v):
        """Strip whitespace from topics."""
        return [topic.strip() for topic in v if topic.strip()]
    
    class Config:
        json_schema_extra = {
            "example": {
                "subject": "Mathematics",
                "topics": ["Pythagorean theorem", "Right triangles"],
                "difficulty": 5,
                "question_count": 10,
                "question_types": ["multiple_choice", "true_false"],
                "student_level": 8
            }
        }


class LearningPlanRequest(BaseModel):
    """Request model for learning plan generation."""
    
    student_id: str = Field(..., min_length=1, description="Student identifier")
    student_level: int = Field(..., ge=1, le=12, description="Student grade level (1-12)")
    subjects: List[str] = Field(..., min_items=1, max_items=10, description="Subjects to cover")
    exam_type: Optional[str] = Field(None, max_length=100, description="Type of exam")
    exam_date: Optional[str] = Field(None, description="Target exam date (YYYY-MM-DD)")
    knowledge_gaps: Optional[List[dict]] = Field(None, description="Identified knowledge gaps")
    current_performance: Optional[dict] = Field(None, description="Current performance metrics")
    planning_days: int = Field(default=7, ge=1, le=30, description="Number of days to plan for")
    
    @validator('subjects')
    def strip_subjects(cls, v):
        """Strip whitespace from subjects."""
        return [subject.strip() for subject in v if subject.strip()]
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "123e4567-e89b-12d3-a456-426614174000",
                "student_level": 10,
                "subjects": ["Mathematics", "Physics"],
                "exam_type": "NMT",
                "exam_date": "2024-06-15",
                "knowledge_gaps": [
                    {"subject": "Mathematics", "topic": "Trigonometry", "severity": "high"}
                ],
                "current_performance": {
                    "overall_score": 75,
                    "subject_scores": {"Mathematics": 70, "Physics": 80}
                },
                "planning_days": 7
            }
        }
