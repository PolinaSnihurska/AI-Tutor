"""Learning plan generation routes."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.services.learning_plan_service import learning_plan_service
from app.logging_config import logger

router = APIRouter(prefix="/api/learning-plans", tags=["learning-plans"])


class GeneratePlanRequest(BaseModel):
    """Request model for learning plan generation."""
    student_id: str = Field(..., description="Student identifier")
    student_level: int = Field(..., ge=1, le=12, description="Grade level (1-12)")
    subjects: List[str] = Field(..., min_items=1, description="List of subjects to cover")
    exam_type: Optional[str] = Field(None, description="Type of exam (e.g., NMT, SAT)")
    exam_date: Optional[datetime] = Field(None, description="Target exam date")
    knowledge_gaps: Optional[List[Dict[str, Any]]] = Field(None, description="Identified knowledge gaps")
    current_performance: Optional[Dict[str, Any]] = Field(None, description="Current performance metrics")
    planning_days: int = Field(7, ge=1, le=30, description="Number of days to plan for")


class AnalyzeGapsRequest(BaseModel):
    """Request model for knowledge gap analysis."""
    student_id: str = Field(..., description="Student identifier")
    test_results: List[Dict[str, Any]] = Field(..., description="Recent test results")
    subjects: List[str] = Field(..., min_items=1, description="Subjects to analyze")


@router.post("/generate")
async def generate_learning_plan(request: GeneratePlanRequest):
    """
    Generate a personalized learning plan using AI.
    
    This endpoint analyzes student knowledge gaps and creates a customized
    daily study plan with tasks and weekly goals.
    """
    try:
        logger.info(f"Generating learning plan for student {request.student_id}")
        
        plan = await learning_plan_service.generate_plan(
            student_id=request.student_id,
            student_level=request.student_level,
            subjects=request.subjects,
            exam_type=request.exam_type,
            exam_date=request.exam_date,
            knowledge_gaps=request.knowledge_gaps,
            current_performance=request.current_performance,
            planning_days=request.planning_days
        )
        
        return {
            "success": True,
            "data": plan
        }
        
    except Exception as e:
        logger.error(f"Error generating learning plan: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning plan: {str(e)}"
        )


@router.post("/analyze-gaps")
async def analyze_knowledge_gaps(request: AnalyzeGapsRequest):
    """
    Analyze test results to identify knowledge gaps.
    
    This endpoint processes test results to find weak topics and areas
    that need additional focus.
    """
    try:
        logger.info(f"Analyzing knowledge gaps for student {request.student_id}")
        
        gaps = await learning_plan_service.analyze_knowledge_gaps(
            student_id=request.student_id,
            test_results=request.test_results,
            subjects=request.subjects
        )
        
        return {
            "success": True,
            "data": {
                "gaps": gaps,
                "total_gaps": len(gaps)
            }
        }
        
    except Exception as e:
        logger.error(f"Error analyzing knowledge gaps: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze knowledge gaps: {str(e)}"
        )
