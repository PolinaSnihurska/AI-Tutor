import { useQuery } from '@tanstack/react-query';
import { learningPlanApi, Task } from '../../lib/api/learningPlanApi';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui';
import { useNavigate } from 'react-router-dom';

export function LearningPlanCard() {
  const navigate = useNavigate();
  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['learningPlan', 'current'],
    queryFn: () => learningPlanApi.getCurrentPlan(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Learning Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Learning Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">No learning plan found. Create one to get started!</p>
          <Button onClick={() => navigate('/learning-plan/create')} size="sm">
            Create Learning Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const todayTasks = plan.dailyTasks
    .filter((task) => {
      const taskDate = new Date(task.dueDate);
      const today = new Date();
      return taskDate.toDateString() === today.toDateString();
    })
    .slice(0, 3);

  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Learning Plan</CardTitle>
          <span className="text-sm text-gray-500">
            {completedToday}/{todayTasks.length} completed
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {todayTasks.length === 0 ? (
          <p className="text-gray-600">No tasks scheduled for today. Great job staying ahead!</p>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={() => navigate('/learning-plan')}
        >
          View Full Plan
        </Button>
      </CardContent>
    </Card>
  );
}

interface TaskItemProps {
  task: Task;
}

function TaskItem({ task }: TaskItemProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const statusIcons = {
    completed: '✓',
    in_progress: '◐',
    pending: '○',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <span className="text-lg mt-0.5">{statusIcons[task.status]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}
          >
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{task.subject}</span>
          <span>•</span>
          <span>{task.estimatedTime} min</span>
        </div>
      </div>
    </div>
  );
}
