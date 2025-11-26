"""Test generation routes."""
from fastapi import APIRouter, HTTPException, status
from app.models.requests import TestGenerationRequest
from app.models.responses import GeneratedTest, ErrorResponse
from app.services.test_generation_service import test_generation_service
from app.logging_config import logger

router = APIRouter(prefix="/tests", tags=["tests"])


@router.post(
    "/generate",
    response_model=GeneratedTest,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse}
    }
)
async def generate_test(request: TestGenerationRequest):
    """
    Generate a test based on specified parameters.
    
    - **subject**: Subject area (e.g., "Mathematics", "Physics")
    - **topics**: List of topics to cover
    - **difficulty**: Difficulty level from 1 (easy) to 10 (hard)
    - **question_count**: Number of questions to generate
    - **question_types**: Types of questions (multiple_choice, true_false, open_ended)
    - **student_level**: Optional grade level (1-12)
    """
    
    try:
        logger.info(f"Test generation request: {request.subject}, {len(request.topics)} topics")
        
        test = await test_generation_service.generate_test(request)
        
        logger.info(f"Generated test with {len(test.questions)} questions")
        
        return test
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "VALIDATION_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Error generating test: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "AI_SERVICE_ERROR",
                "message": "Failed to generate test"
            }
        )
