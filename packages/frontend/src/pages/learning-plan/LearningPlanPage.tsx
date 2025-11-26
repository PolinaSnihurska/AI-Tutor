import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningPlanApi, Task, Goal } from '../../lib/api/learningPlanApi';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

export function LearningPlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly'>('daily');

  const { data: plan, isLoading } = useQuery({
    queryKey: ['learningPlan', 'current'],
    queryFn: () => learningPlanApi.getCurrentPlan(),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task['status'] }) =>
      learningPlanApi.updateTaskStatus(plan!.id, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPlan'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Learning Plan Yet
              </h2>
              <p className="text-gray-600 mb-6">
                Create a personalized learning plan to get started
              </p>
              <Button onClick={() => navigate('/learning-plan/create')}>
                Create Learning Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const todayTasks = plan.dailyTasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = plan.dailyTasks.filter((task) => {
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    return taskDate > today;
  }).slice(0, 10);

  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const completionRate = todayTasks.length > 0 
    ? (completedToday / todayTasks.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Learning Plan</h1>
          <p className="text-gray-600 mt-2">
            {plan.examType && `Preparing for ${plan.examType}`}
            {plan.examDate && ` • Exam on ${new Date(plan.examDate).toLocaleDateString()}`}
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {plan.completionRate.toFixed(0)}%
                </div>
                <p className="text-sm text-gray-600 mt-1">Overall Progress</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {completedToday}/{todayTasks.length}
                </div>
                <p className="text-sm text-gray-600 mt-1">Today's Tasks</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {plan.weeklyGoals.filter(g => g.completed).length}/{plan.weeklyGoals.length}
                </div>
                <p className="text-sm text-gray-600 mt-1">Weekly Goals</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {upcomingTasks.length}
                </div>
                <p className="text-sm text-gray-600 mt-1">Upcoming Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedView === 'daily' ? 'primary' : 'outline'}
            onClick={() => setSelectedView('daily')}
          >
            Daily Tasks
          </Button>
          <Button
            variant={selectedView === 'weekly' ? 'primary' : 'outline'}
            onClick={() => setSelectedView('weekly')}
          >
            Weekly Goals
          </Button>
        </div>

        {/* Content */}
        {selectedView === 'daily' ? (
          <div className="space-y-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Today's Tasks</CardTitle>
                  <div className="text-sm text-gray-600">
                    {completionRate.toFixed(0)}% complete
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {todayTasks.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">
                    No tasks scheduled for today. Great job staying ahead!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(status) =>
                          updateTaskMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            {upcomingTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(status) =>
                          updateTaskMutation.mutate({ taskId: task.id, status })
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {plan.weeklyGoals.length === 0 ? (
                <p className="text-gray-600 text-center py-6">
                  No weekly goals set yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {plan.weeklyGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (status: Task['status']) => void;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const priorityColors = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-green-300 bg-green-50',
  };

  const typeIcons = {
    lesson: '📖',
    test: '📝',
    practice: '✏️',
  };

  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`border-l-4 ${priorityColors[task.priority]} rounded-lg p-4 transition-all ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={(e) =>
            onStatusChange(e.target.checked ? 'completed' : 'pending')
          }
          className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{typeIcons[task.type]}</span>
            <h4
              className={`text-base font-medium ${
                isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              📚 {task.subject}
            </span>
            <span className="flex items-center gap-1">
              ⏱️ {task.estimatedTime} min
            </span>
            <span className="flex items-center gap-1">
              🎯 {task.priority} priority
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 mt-2">{task.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
}

function GoalCard({ goal }: GoalCardProps) {
  const targetDate = new Date(goal.targetDate);
  const isOverdue = targetDate < new Date() && !goal.completed;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            goal.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300'
          }`}
        >
          {goal.completed && <span className="text-white text-sm">✓</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={`text-base font-medium mb-1 ${
              goal.completed ? 'line-through text-gray-500' : 'text-gray-900'
            }`}
          >
            {goal.title}
          </h4>
          <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    goal.completed ? 'bg-green-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
            <div className="ml-4 text-right">
              <p
                className={`text-xs ${
                  isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                }`}
              >
                {isOverdue ? 'Overdue' : 'Due'} {targetDate.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
