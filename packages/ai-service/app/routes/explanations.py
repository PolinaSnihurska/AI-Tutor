"""Explanation generation endpoints."""
import logging
from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import json

from app.models.requests import ExplanationRequest
from app.models.responses import Explanation, Example
from app.services.explanation_service import explanation_service
from app.clients.openai_client import openai_client
from app.prompts.prompt_manager import prompt_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/explanations", tags=["explanations"])


@router.post("/", response_model=Explanation, status_code=status.HTTP_200_OK)
async def generate_explanation(request: ExplanationRequest):
    """
    Generate an explanation for a topic.
    
    This endpoint creates age-appropriate explanations with examples and related topics.
    Responses are cached for common queries to improve performance.
    
    - **topic**: The topic to explain (required)
    - **subject**: The subject area (required)
    - **student_level**: Student grade level 1-12 (required)
    - **context**: Additional context (optional)
    - **previous_explanations**: Previous explanations in conversation (optional)
    """
    try:
        logger.info(f"Explanation request: {request.topic} for grade {request.student_level}")
        
        explanation = await explanation_service.get_explanation(request)
        
        logger.info(f"Successfully generated explanation for: {request.topic}")
        return explanation
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "EXPLANATION_GENERATION_FAILED",
                "message": "Failed to generate explanation",
                "details": str(e)
            }
        )


@router.post("/stream")
async def stream_explanation(request: ExplanationRequest):
    """
    Stream an explanation for long responses.
    
    This endpoint streams the explanation content as it's generated,
    providing a better user experience for lengthy explanations.
    """
    try:
        logger.info(f"Streaming explanation request: {request.topic}")
        
        # Format prompt
        messages = prompt_manager.format_explanation_prompt(
            topic=request.topic,
            subject=request.subject,
            student_level=request.student_level,
            context=request.context
        )
        
        # Create streaming response
        async def generate_stream():
            try:
                response = await openai_client.create_completion(
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2000,
                    stream=True
                )
                
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Error in stream: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        logger.error(f"Error setting up stream: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "STREAM_SETUP_FAILED",
                "message": "Failed to set up streaming response"
            }
        )


@router.get("/examples")
async def generate_examples(
    topic: str = Query(..., description="Topic for examples"),
    subject: str = Query(..., description="Subject area"),
    student_level: int = Query(..., ge=1, le=12, description="Student grade level"),
    num_examples: int = Query(2, ge=1, le=5, description="Number of examples"),
    context: Optional[str] = Query(None, description="Additional context")
):
    """
    Generate specific examples for a topic.
    
    This endpoint creates practical examples to illustrate a concept.
    
    - **topic**: The topic for examples (required)
    - **subject**: The subject area (required)
    - **student_level**: Student grade level 1-12 (required)
    - **num_examples**: Number of examples to generate (1-5, default: 2)
    - **context**: Additional context (optional)
    """
    try:
        logger.info(f"Example generation request: {topic}, count: {num_examples}")
        
        examples = await explanation_service.generate_examples(
            topic=topic,
            subject=subject,
            student_level=student_level,
            num_examples=num_examples,
            context=context
        )
        
        logger.info(f"Successfully generated {len(examples)} examples")
        return {"examples": examples}
        
    except Exception as e:
        logger.error(f"Error generating examples: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "EXAMPLE_GENERATION_FAILED",
                "message": "Failed to generate examples"
            }
        )
