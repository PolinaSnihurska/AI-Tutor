import { LearningPlanModel } from '../models/LearningPlan';
import { LearningPlan, Task, Goal } from '@ai-tutor/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { ReminderService } from './reminderService';
import { UserActivityService } from './userActivityService';

export class LearningPlanService {
  private reminderService: ReminderService;
  private activityService: UserActivityService;

  constructor() {
    this.reminderService = new ReminderService();
    this.activityService = new UserActivityService();
  }
  /**
   * Create a new learning plan for a student
   */
  async createPlan(
    studentId: string,
    examType?: string,
    examDate?: Date,
    subjects?: string[]
  ): Promise<LearningPlan> {
    return await LearningPlanModel.create({
      studentId,
      examType,
      examDate,
      subjects: subjects || [],
      dailyTasks: [],
      weeklyGoals: [],
    });
  }

  /**
   * Get a learning plan by ID
   */
  async getPlanById(planId: string): Promise<LearningPlan | null> {
    return await LearningPlanModel.findById(planId);
  }

  /**
   * Get all learning plans for a student
   */
  async getPlansByStudentId(studentId: string): Promise<LearningPlan[]> {
    return await LearningPlanModel.findByStudentId(studentId);
  }

  /**
   * Get the active learning plan for a student
   */
  async getActivePlan(studentId: string): Promise<LearningPlan | null> {
    return await LearningPlanModel.findActiveByStudentId(studentId);
  }

  /**
   * Update a learning plan
   */
  async updatePlan(
    planId: string,
    updates: {
      examType?: string;
      examDate?: Date;
      subjects?: string[];
      dailyTasks?: Task[];
      weeklyGoals?: Goal[];
    }
  ): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.update(planId, updates);
    
    // Recalculate completion rate if tasks were updated
    if (updates.dailyTasks && plan) {
      return await LearningPlanModel.updateCompletionRate(planId);
    }
    
    return plan;
  }

  /**
   * Add a task to a learning plan
   */
  async addTask(planId: string, task: Omit<Task, 'id'>): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const newTask: Task = {
      id: uuidv4(),
      ...task,
    };

    const updatedTasks = [...plan.dailyTasks, newTask];
    const updatedPlan = await LearningPlanModel.updateTasks(planId, updatedTasks);
    
    if (updatedPlan) {
      // Schedule reminder for the new task
      await this.reminderService.scheduleTaskReminder(plan.studentId, newTask);
      return await LearningPlanModel.updateCompletionRate(planId);
    }
    
    return updatedPlan;
  }

  /**
   * Update a specific task in a learning plan
   */
  async updateTask(planId: string, taskId: string, updates: Partial<Task>): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const updatedTasks = plan.dailyTasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );

    const updatedPlan = await LearningPlanModel.updateTasks(planId, updatedTasks);
    
    if (updatedPlan) {
      // If due date changed, reschedule reminders
      if (updates.dueDate) {
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask) {
          await this.reminderService.rescheduleTaskReminders(plan.studentId, updatedTask);
        }
      }
      return await LearningPlanModel.updateCompletionRate(planId);
    }
    
    return updatedPlan;
  }

  /**
   * Mark a task as completed
   */
  async completeTask(planId: string, taskId: string): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    // Record task completion in activity tracking
    await this.activityService.recordTaskCompletion(plan.studentId);
    
    // Cancel pending reminders for this task
    await this.reminderService.cancelTaskReminders(taskId);
    
    return await this.updateTask(planId, taskId, { status: 'completed' });
  }

  /**
   * Remove a task from a learning plan
   */
  async removeTask(planId: string, taskId: string): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    // Cancel reminders for the task being removed
    await this.reminderService.cancelTaskReminders(taskId);

    const updatedTasks = plan.dailyTasks.filter(task => task.id !== taskId);
    const updatedPlan = await LearningPlanModel.updateTasks(planId, updatedTasks);
    
    if (updatedPlan) {
      return await LearningPlanModel.updateCompletionRate(planId);
    }
    
    return updatedPlan;
  }

  /**
   * Add a goal to a learning plan
   */
  async addGoal(planId: string, goal: Omit<Goal, 'id'>): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const newGoal: Goal = {
      id: uuidv4(),
      ...goal,
    };

    const updatedGoals = [...plan.weeklyGoals, newGoal];
    return await LearningPlanModel.updateGoals(planId, updatedGoals);
  }

  /**
   * Update a specific goal in a learning plan
   */
  async updateGoal(planId: string, goalId: string, updates: Partial<Goal>): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const updatedGoals = plan.weeklyGoals.map(goal =>
      goal.id === goalId ? { ...goal, ...updates } : goal
    );

    return await LearningPlanModel.updateGoals(planId, updatedGoals);
  }

  /**
   * Mark a goal as completed
   */
  async completeGoal(planId: string, goalId: string): Promise<LearningPlan | null> {
    return await this.updateGoal(planId, goalId, { completed: true, progress: 100 });
  }

  /**
   * Remove a goal from a learning plan
   */
  async removeGoal(planId: string, goalId: string): Promise<LearningPlan | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const updatedGoals = plan.weeklyGoals.filter(goal => goal.id !== goalId);
    return await LearningPlanModel.updateGoals(planId, updatedGoals);
  }

  /**
   * Delete a learning plan
   */
  async deletePlan(planId: string): Promise<void> {
    await LearningPlanModel.delete(planId);
  }

  /**
   * Calculate progress for a learning plan
   */
  async calculateProgress(planId: string): Promise<{
    completionRate: number;
    completedTasks: number;
    totalTasks: number;
    completedGoals: number;
    totalGoals: number;
  } | null> {
    const plan = await LearningPlanModel.findById(planId);
    if (!plan) return null;

    const totalTasks = plan.dailyTasks.length;
    const completedTasks = plan.dailyTasks.filter(task => task.status === 'completed').length;
    const totalGoals = plan.weeklyGoals.length;
    const completedGoals = plan.weeklyGoals.filter(goal => goal.completed).length;

    return {
      completionRate: plan.completionRate,
      completedTasks,
      totalTasks,
      completedGoals,
      totalGoals,
    };
  }

  /**
   * Schedule reminders for all pending tasks in a plan
   */
  async scheduleRemindersForPlan(planId: string): Promise<void> {
    await this.reminderService.scheduleRemindersForPlan(planId);
  }

  /**
   * Schedule daily summary for a student
   */
  async scheduleDailySummary(studentId: string): Promise<void> {
    await this.reminderService.scheduleDailySummary(studentId);
  }

  /**
   * Record user login for activity tracking
   */
  async recordUserLogin(userId: string): Promise<void> {
    await this.activityService.recordLogin(userId);
  }

  /**
   * Record study time for activity tracking
   */
  async recordStudyTime(userId: string, minutes: number): Promise<void> {
    await this.activityService.recordStudyTime(userId, minutes);
  }
}
