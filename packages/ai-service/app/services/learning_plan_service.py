"""Learning plan generation service."""
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from langchain.prompts import ChatPromptTemplate

from app.clients.openai_client import openai_client
from app.clients.redis_client import redis_client
from app.logging_config import logger


class LearningPlanService:
    """Service for AI-powered learning plan generation."""
    
    PLAN_GENERATION_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert educational planner specializing in creating personalized learning plans.
Your goal is to analyze student knowledge gaps and create effective, achievable daily study plans.

Guidelines:
- Create realistic daily tasks based on available time
- Prioritize weak areas while maintaining overall progress
- Balance different types of activities (lessons, practice, tests)
- Set achievable weekly goals
- Consider exam timeline and urgency
- Adapt difficulty to student level
- Include variety to maintain engagement"""),
        ("human", """Create a personalized learning plan with the following parameters:

Student Information:
- Grade Level: {student_level}
- Subjects: {subjects}
- Exam Type: {exam_type}
- Exam Date: {exam_date}
- Days Until Exam: {days_until_exam}

Knowledge Gaps Analysis:
{knowledge_gaps}

Current Performance:
{current_performance}

Requirements:
- Generate daily tasks for the next {planning_days} days
- Each task should have: title, subject, type (lesson/test/practice), estimated time (minutes), priority (high/medium/low), description
- Create {num_weekly_goals} weekly goals with clear targets
- Focus on addressing knowledge gaps while maintaining overall progress
- Ensure tasks are age-appropriate and achievable

Return your response as a JSON object with this structure:
{{
  "daily_tasks": [
    {{
      "title": "Task title",
      "subject": "Subject name",
      "type": "lesson|test|practice",
      "estimatedTime": minutes,
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD",
      "description": "Brief description"
    }}
  ],
  "weekly_goals": [
    {{
      "title": "Goal title",
      "description": "Detailed description",
      "targetDate": "YYYY-MM-DD",
      "progress": 0
    }}
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}}""")
    ])
    
    async def generate_plan(
        self,
        student_id: str,
        student_level: int,
        subjects: List[str],
        exam_type: Optional[str] = None,
        exam_date: Optional[datetime] = None,
        knowledge_gaps: Optional[List[Dict[str, Any]]] = None,
        current_performance: Optional[Dict[str, Any]] = None,
        planning_days: int = 7
    ) -> Dict[str, Any]:
        """
        Generate a personalized learning plan using AI.
        
        Args:
            student_id: Student identifier
            student_level: Grade level (1-12)
            subjects: List of subjects to cover
            exam_type: Type of exam (e.g., "NMT", "SAT")
            exam_date: Target exam date
            knowledge_gaps: List of identified knowledge gaps
            current_performance: Current performance metrics
            planning_days: Number of days to plan for
            
        Returns:
            Dictionary containing daily tasks, weekly goals, and recommendations
        """
        try:
            # Check cache first
            cache_key = self._generate_cache_key(
                student_id, subjects, exam_type, planning_days
            )
            cached_plan = await redis_client.get(cache_key)
            if cached_plan:
                logger.info(f"Returning cached learning plan for student {student_id}")
                return json.loads(cached_plan)
            
            # Calculate days until exam
            days_until_exam = "Not specified"
            if exam_date:
                days_until_exam = (exam_date - datetime.now()).days
                if days_until_exam < 0:
                    days_until_exam = "Exam has passed"
            
            # Format knowledge gaps
            gaps_text = self._format_knowledge_gaps(knowledge_gaps)
            
            # Format current performance
            performance_text = self._format_performance(current_performance)
            
            # Determine number of weekly goals based on planning period
            num_weekly_goals = max(2, planning_days // 7)
            
            # Generate prompt
            prompt = self.PLAN_GENERATION_PROMPT.format_messages(
                student_level=student_level,
                subjects=", ".join(subjects),
                exam_type=exam_type or "General assessment",
                exam_date=exam_date.strftime("%Y-%m-%d") if exam_date else "Not specified",
                days_until_exam=days_until_exam,
                knowledge_gaps=gaps_text,
                current_performance=performance_text,
                planning_days=planning_days,
                num_weekly_goals=num_weekly_goals
            )
            
            # Call OpenAI
            logger.info(f"Generating learning plan for student {student_id}")
            start_time = datetime.now()
            
            response = await openai_client.chat_completion(
                messages=[{"role": msg.type, "content": msg.content} for msg in prompt],
                temperature=0.7,
                max_tokens=2000
            )
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Learning plan generated in {duration:.2f}s")
            
            # Parse response
            plan_data = self._parse_plan_response(response, planning_days)
            
            # Cache the result (24 hours)
            await redis_client.set(cache_key, json.dumps(plan_data), ex=86400)
            
            return plan_data
            
        except Exception as e:
            logger.error(f"Error generating learning plan: {e}", exc_info=True)
            raise
    
    async def analyze_knowledge_gaps(
        self,
        student_id: str,
        test_results: List[Dict[str, Any]],
        subjects: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Analyze test results to identify knowledge gaps.
        
        Args:
            student_id: Student identifier
            test_results: List of recent test results
            subjects: Subjects to analyze
            
        Returns:
            List of identified knowledge gaps with severity and topics
        """
        try:
            if not test_results:
                return []
            
            gaps = []
            
            # Analyze each subject
            for subject in subjects:
                subject_results = [
                    r for r in test_results 
                    if r.get('subject', '').lower() == subject.lower()
                ]
                
                if not subject_results:
                    continue
                
                # Find weak topics (< 60% correct)
                weak_topics = {}
                for result in subject_results:
                    for question_result in result.get('detailed_results', []):
                        if not question_result.get('correct', False):
                            topic = question_result.get('topic', 'Unknown')
                            weak_topics[topic] = weak_topics.get(topic, 0) + 1
                
                # Create gap entries
                for topic, error_count in weak_topics.items():
                    severity = 'high' if error_count >= 3 else 'medium' if error_count >= 2 else 'low'
                    gaps.append({
                        'subject': subject,
                        'topic': topic,
                        'severity': severity,
                        'error_count': error_count
                    })
            
            # Sort by severity and error count
            severity_order = {'high': 0, 'medium': 1, 'low': 2}
            gaps.sort(key=lambda x: (severity_order[x['severity']], -x['error_count']))
            
            logger.info(f"Identified {len(gaps)} knowledge gaps for student {student_id}")
            return gaps
            
        except Exception as e:
            logger.error(f"Error analyzing knowledge gaps: {e}", exc_info=True)
            return []
    
    def _generate_cache_key(
        self,
        student_id: str,
        subjects: List[str],
        exam_type: Optional[str],
        planning_days: int
    ) -> str:
        """Generate cache key for learning plan."""
        subjects_str = "_".join(sorted(subjects))
        exam_str = exam_type or "general"
        return f"learning_plan:{student_id}:{subjects_str}:{exam_str}:{planning_days}"
    
    def _format_knowledge_gaps(self, gaps: Optional[List[Dict[str, Any]]]) -> str:
        """Format knowledge gaps for prompt."""
        if not gaps:
            return "No specific knowledge gaps identified. Focus on comprehensive coverage."
        
        formatted = []
        for gap in gaps[:10]:  # Limit to top 10 gaps
            formatted.append(
                f"- {gap.get('subject', 'Unknown')}: {gap.get('topic', 'Unknown')} "
                f"(Severity: {gap.get('severity', 'medium')}, Errors: {gap.get('error_count', 0)})"
            )
        
        return "\n".join(formatted)
    
    def _format_performance(self, performance: Optional[Dict[str, Any]]) -> str:
        """Format current performance for prompt."""
        if not performance:
            return "No performance data available. Assume beginner level."
        
        formatted = []
        
        if 'overall_score' in performance:
            formatted.append(f"Overall Score: {performance['overall_score']}%")
        
        if 'subject_scores' in performance:
            formatted.append("\nSubject Scores:")
            for subject, score in performance['subject_scores'].items():
                formatted.append(f"- {subject}: {score}%")
        
        if 'tests_completed' in performance:
            formatted.append(f"\nTests Completed: {performance['tests_completed']}")
        
        if 'study_time' in performance:
            formatted.append(f"Total Study Time: {performance['study_time']} minutes")
        
        return "\n".join(formatted) if formatted else "Limited performance data available."
    
    def _parse_plan_response(self, response: str, planning_days: int) -> Dict[str, Any]:
        """Parse AI response into structured plan data."""
        try:
            # Try to parse as JSON
            plan_data = json.loads(response)
            
            # Validate and set defaults
            if 'daily_tasks' not in plan_data:
                plan_data['daily_tasks'] = []
            
            if 'weekly_goals' not in plan_data:
                plan_data['weekly_goals'] = []
            
            if 'recommendations' not in plan_data:
                plan_data['recommendations'] = []
            
            # Ensure tasks have required fields
            for task in plan_data['daily_tasks']:
                if 'id' not in task:
                    task['id'] = f"task_{hash(task.get('title', ''))}"
                if 'status' not in task:
                    task['status'] = 'pending'
            
            # Ensure goals have required fields
            for goal in plan_data['weekly_goals']:
                if 'id' not in goal:
                    goal['id'] = f"goal_{hash(goal.get('title', ''))}"
                if 'completed' not in goal:
                    goal['completed'] = False
                if 'progress' not in goal:
                    goal['progress'] = 0
            
            return plan_data
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI response as JSON, returning default plan")
            # Return a default plan structure
            return {
                'daily_tasks': [],
                'weekly_goals': [],
                'recommendations': [
                    'Review fundamental concepts regularly',
                    'Practice with varied problem types',
                    'Take regular breaks to maintain focus'
                ]
            }


# Singleton instance
learning_plan_service = LearningPlanService()

