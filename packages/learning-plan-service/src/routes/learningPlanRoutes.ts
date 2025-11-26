import { Router, Request, Response } from 'express';
import { LearningPlanService } from '../services/learningPlanService';
import { Task, Goal } from '@ai-tutor/shared-types';
import axios from 'axios';

const router = Router();
const learningPlanService = new LearningPlanService();

// AI Service URL from environment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3005';

/**
 * Generate a new learning plan using AI
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      studentLevel,
      subjects,
      examType,
      examDate,
      knowledgeGaps,
      currentPerformance,
      planningDays = 7,
    } = req.body;

    // Validate required fields
    if (!studentId || !studentLevel || !subjects || subjects.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, studentLevel, subjects',
      });
    }

    // Call AI service to generate plan
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/api/learning-plans/generate`, {
      student_id: studentId,
      student_level: studentLevel,
      subjects,
      exam_type: examType,
      exam_date: examDate,
      knowledge_gaps: knowledgeGaps,
      current_performance: currentPerformance,
      planning_days: planningDays,
    });

    const planData = aiResponse.data.data;

    // Create learning plan in database
    const plan = await learningPlanService.createPlan(
      studentId,
      examType,
      examDate ? new Date(examDate) : undefined,
      subjects
    );

    // Add tasks from AI-generated plan
    for (const task of planData.daily_tasks || []) {
      await learningPlanService.addTask(plan.id, {
        title: task.title,
        subject: task.subject,
        type: task.type,
        estimatedTime: task.estimatedTime,
        priority: task.priority,
        status: 'pending',
        dueDate: new Date(task.dueDate),
        description: task.description,
      });
    }

    // Add goals from AI-generated plan
    for (const goal of planData.weekly_goals || []) {
      await learningPlanService.addGoal(plan.id, {
        title: goal.title,
        description: goal.description,
        targetDate: new Date(goal.targetDate),
        completed: false,
        progress: 0,
      });
    }

    // Get updated plan with tasks and goals
    const updatedPlan = await learningPlanService.getPlanById(plan.id);

    // Schedule reminders for the plan
    await learningPlanService.scheduleRemindersForPlan(plan.id);

    res.status(201).json({
      ...updatedPlan,
      recommendations: planData.recommendations || [],
    });
  } catch (error: any) {
    console.error('Error generating learning plan:', error);
    res.status(500).json({
      error: 'Failed to generate learning plan',
      details: error.message,
    });
  }
});

/**
 * Get a learning plan by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.getPlanById(req.params.id);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error fetching learning plan:', error);
    res.status(500).json({
      error: 'Failed to fetch learning plan',
      details: error.message,
    });
  }
});

/**
 * Get all learning plans for a student
 */
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const plans = await learningPlanService.getPlansByStudentId(req.params.studentId);
    res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error('Error fetching learning plans:', error);
    res.status(500).json({
      error: 'Failed to fetch learning plans',
      details: error.message,
    });
  }
});

/**
 * Get active learning plan for a student
 */
router.get('/student/:studentId/active', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.getActivePlan(req.params.studentId);

    if (!plan) {
      return res.status(404).json({ error: 'No active learning plan found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error fetching active learning plan:', error);
    res.status(500).json({
      error: 'Failed to fetch active learning plan',
      details: error.message,
    });
  }
});

/**
 * Update a learning plan
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { examType, examDate, subjects, dailyTasks, weeklyGoals } = req.body;

    const plan = await learningPlanService.updatePlan(req.params.id, {
      examType,
      examDate: examDate ? new Date(examDate) : undefined,
      subjects,
      dailyTasks,
      weeklyGoals,
    });

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error updating learning plan:', error);
    res.status(500).json({
      error: 'Failed to update learning plan',
      details: error.message,
    });
  }
});

/**
 * Add a task to a learning plan
 */
router.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const task: Omit<Task, 'id'> = {
      ...req.body,
      dueDate: new Date(req.body.dueDate),
    };

    const plan = await learningPlanService.addTask(req.params.id, task);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error adding task:', error);
    res.status(500).json({
      error: 'Failed to add task',
      details: error.message,
    });
  }
});

/**
 * Update a task in a learning plan
 */
router.put('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const updates: Partial<Task> = req.body;
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }

    const plan = await learningPlanService.updateTask(
      req.params.id,
      req.params.taskId,
      updates
    );

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or task not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({
      error: 'Failed to update task',
      details: error.message,
    });
  }
});

/**
 * Complete a task
 */
router.post('/:id/tasks/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.completeTask(req.params.id, req.params.taskId);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or task not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error completing task:', error);
    res.status(500).json({
      error: 'Failed to complete task',
      details: error.message,
    });
  }
});

/**
 * Remove a task from a learning plan
 */
router.delete('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.removeTask(req.params.id, req.params.taskId);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or task not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error removing task:', error);
    res.status(500).json({
      error: 'Failed to remove task',
      details: error.message,
    });
  }
});

/**
 * Add a goal to a learning plan
 */
router.post('/:id/goals', async (req: Request, res: Response) => {
  try {
    const goal: Omit<Goal, 'id'> = {
      ...req.body,
      targetDate: new Date(req.body.targetDate),
    };

    const plan = await learningPlanService.addGoal(req.params.id, goal);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error adding goal:', error);
    res.status(500).json({
      error: 'Failed to add goal',
      details: error.message,
    });
  }
});

/**
 * Update a goal in a learning plan
 */
router.put('/:id/goals/:goalId', async (req: Request, res: Response) => {
  try {
    const updates: Partial<Goal> = req.body;
    if (updates.targetDate) {
      updates.targetDate = new Date(updates.targetDate);
    }

    const plan = await learningPlanService.updateGoal(
      req.params.id,
      req.params.goalId,
      updates
    );

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or goal not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error updating goal:', error);
    res.status(500).json({
      error: 'Failed to update goal',
      details: error.message,
    });
  }
});

/**
 * Complete a goal
 */
router.post('/:id/goals/:goalId/complete', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.completeGoal(req.params.id, req.params.goalId);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or goal not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error completing goal:', error);
    res.status(500).json({
      error: 'Failed to complete goal',
      details: error.message,
    });
  }
});

/**
 * Remove a goal from a learning plan
 */
router.delete('/:id/goals/:goalId', async (req: Request, res: Response) => {
  try {
    const plan = await learningPlanService.removeGoal(req.params.id, req.params.goalId);

    if (!plan) {
      return res.status(404).json({ error: 'Learning plan or goal not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Error removing goal:', error);
    res.status(500).json({
      error: 'Failed to remove goal',
      details: error.message,
    });
  }
});

/**
 * Get progress for a learning plan
 */
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const progress = await learningPlanService.calculateProgress(req.params.id);

    if (!progress) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Error calculating progress:', error);
    res.status(500).json({
      error: 'Failed to calculate progress',
      details: error.message,
    });
  }
});

/**
 * Delete a learning plan
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await learningPlanService.deletePlan(req.params.id);
    res.json({ success: true, message: 'Learning plan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting learning plan:', error);
    res.status(500).json({
      error: 'Failed to delete learning plan',
      details: error.message,
    });
  }
});

export default router;
