"""Test generation service using OpenAI."""
import json
import uuid
from typing import List, Dict, Any
from app.clients.openai_client import openai_client
from app.clients.redis_client import redis_client
from app.models.requests import TestGenerationRequest
from app.models.responses import GeneratedTest, GeneratedQuestion
from app.logging_config import logger


class TestGenerationService:
    """Service for generating tests using AI."""
    
    def __init__(self):
        self.cache_ttl = 3600  # 1 hour cache for test templates
    
    async def generate_test(self, request: TestGenerationRequest) -> GeneratedTest:
        """Generate a test based on the request parameters."""
        
        # Check cache first
        cache_key = self._get_cache_key(request)
        cached_test = await redis_client.get(cache_key)
        
        if cached_test:
            logger.info(f"Cache hit for test generation: {cache_key}")
            return GeneratedTest(**json.loads(cached_test))
        
        logger.info(f"Generating test for subject: {request.subject}, topics: {request.topics}")
        
        # Generate questions
        questions = await self._generate_questions(request)
        
        # Create test response
        test = GeneratedTest(
            title=self._generate_title(request.subject, request.topics),
            subject=request.subject,
            topics=request.topics,
            questions=questions,
            time_limit=self._calculate_time_limit(len(questions), request.difficulty),
            passing_score=self._calculate_passing_score(request.difficulty)
        )
        
        # Cache the result
        await redis_client.set(
            cache_key,
            test.model_dump_json(),
            ex=self.cache_ttl
        )
        
        return test
    
    async def _generate_questions(
        self, 
        request: TestGenerationRequest
    ) -> List[GeneratedQuestion]:
        """Generate questions using OpenAI."""
        
        questions = []
        questions_per_type = self._distribute_questions(
            request.question_count,
            request.question_types
        )
        
        for question_type, count in questions_per_type.items():
            if count > 0:
                type_questions = await self._generate_questions_by_type(
                    question_type=question_type,
                    count=count,
                    subject=request.subject,
                    topics=request.topics,
                    difficulty=request.difficulty,
                    student_level=request.student_level
                )
                questions.extend(type_questions)
        
        return questions
    
    async def _generate_questions_by_type(
        self,
        question_type: str,
        count: int,
        subject: str,
        topics: List[str],
        difficulty: int,
        student_level: int = None
    ) -> List[GeneratedQuestion]:
        """Generate questions of a specific type."""
        
        prompt = self._build_question_generation_prompt(
            question_type=question_type,
            count=count,
            subject=subject,
            topics=topics,
            difficulty=difficulty,
            student_level=student_level
        )
        
        try:
            response = await openai_client.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content creator. Generate high-quality test questions in valid JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the response
            content = response.choices[0].message.content
            questions_data = self._parse_questions_response(content, question_type)
            
            # Convert to GeneratedQuestion objects
            questions = []
            for i, q_data in enumerate(questions_data):
                question = GeneratedQuestion(
                    id=str(uuid.uuid4()),
                    type=question_type,
                    content=q_data['content'],
                    options=q_data.get('options'),
                    correct_answer=q_data['correct_answer'],
                    explanation=q_data['explanation'],
                    difficulty=difficulty,
                    topic=q_data.get('topic', topics[i % len(topics)]),
                    points=self._calculate_points(difficulty)
                )
                questions.append(question)
            
            return questions
            
        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            raise
    
    def _build_question_generation_prompt(
        self,
        question_type: str,
        count: int,
        subject: str,
        topics: List[str],
        difficulty: int,
        student_level: int = None
    ) -> str:
        """Build the prompt for question generation."""
        
        topics_str = ", ".join(topics)
        level_info = f" for grade {student_level} students" if student_level else ""
        
        if question_type == 'multiple_choice':
            format_instructions = """
Each question should have:
- "content": the question text
- "options": array of 4 answer choices
- "correct_answer": the correct option (exact match from options)
- "explanation": why the answer is correct
- "topic": which topic this question covers
"""
        elif question_type == 'true_false':
            format_instructions = """
Each question should have:
- "content": the statement to evaluate
- "options": ["True", "False"]
- "correct_answer": either "True" or "False"
- "explanation": why the answer is correct
- "topic": which topic this question covers
"""
        else:  # open_ended
            format_instructions = """
Each question should have:
- "content": the question text
- "correct_answer": a sample correct answer or key points
- "explanation": what makes a good answer
- "topic": which topic this question covers
"""
        
        prompt = f"""Generate {count} {question_type.replace('_', ' ')} questions about {subject}{level_info}.

Topics to cover: {topics_str}
Difficulty level: {difficulty}/10

{format_instructions}

Return ONLY a valid JSON array of questions. Example format:
[
  {{
    "content": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Explanation here",
    "topic": "Topic name"
  }}
]

Make questions clear, educational, and appropriate for the difficulty level."""
        
        return prompt
    
    def _parse_questions_response(
        self, 
        content: str, 
        question_type: str
    ) -> List[Dict[str, Any]]:
        """Parse the AI response into question data."""
        
        try:
            # Try to extract JSON from the response
            content = content.strip()
            
            # Remove markdown code blocks if present
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()
            
            questions = json.loads(content)
            
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            
            return questions
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse questions JSON: {e}")
            logger.error(f"Content: {content}")
            raise ValueError("Invalid JSON response from AI")
    
    def _distribute_questions(
        self,
        total_count: int,
        question_types: List[str]
    ) -> Dict[str, int]:
        """Distribute questions across types."""
        
        distribution = {}
        base_count = total_count // len(question_types)
        remainder = total_count % len(question_types)
        
        for i, q_type in enumerate(question_types):
            distribution[q_type] = base_count + (1 if i < remainder else 0)
        
        return distribution
    
    def _generate_title(self, subject: str, topics: List[str]) -> str:
        """Generate a title for the test."""
        
        if len(topics) == 1:
            return f"{subject}: {topics[0]} Test"
        elif len(topics) <= 3:
            return f"{subject}: {', '.join(topics)} Test"
        else:
            return f"{subject}: Multiple Topics Test"
    
    def _calculate_time_limit(self, question_count: int, difficulty: int) -> int:
        """Calculate suggested time limit in minutes."""
        
        # Base time per question increases with difficulty
        base_time = 1 + (difficulty / 5)  # 1-3 minutes per question
        total_minutes = int(question_count * base_time)
        
        # Round to nearest 5 minutes
        return max(5, round(total_minutes / 5) * 5)
    
    def _calculate_passing_score(self, difficulty: int) -> int:
        """Calculate suggested passing score percentage."""
        
        # Easier tests have higher passing scores
        if difficulty <= 3:
            return 80
        elif difficulty <= 6:
            return 70
        else:
            return 60
    
    def _calculate_points(self, difficulty: int) -> int:
        """Calculate points for a question based on difficulty."""
        
        if difficulty <= 3:
            return 1
        elif difficulty <= 6:
            return 2
        else:
            return 3
    
    def _get_cache_key(self, request: TestGenerationRequest) -> str:
        """Generate cache key for a test generation request."""
        
        topics_str = "_".join(sorted(request.topics))
        types_str = "_".join(sorted(request.question_types))
        
        return f"test:{request.subject}:{topics_str}:{request.difficulty}:{request.question_count}:{types_str}"


# Singleton instance
test_generation_service = TestGenerationService()
