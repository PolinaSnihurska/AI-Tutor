import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { testApi } from '../../lib/api/testApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'test' | 'lesson' | 'achievement';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export function RecentActivitiesCard() {
  const navigate = useNavigate();
  const { data: testHistory, isLoading } = useQuery({
    queryKey: ['testHistory'],
    queryFn: () => testApi.getTestHistory(),
  });

  // Transform test history into activities
  const activities: Activity[] = useMemo(() => {
    if (!testHistory) return [];

    return testHistory.slice(0, 5).map((result) => ({
      id: result.id,
      type: 'test' as const,
      title: `Completed Test`,
      description: `Score: ${result.percentage}% (${result.correctAnswers}/${result.totalQuestions})`,
      timestamp: new Date(),
      icon: '📝',
      color: result.percentage >= 70 ? 'text-green-600' : 'text-yellow-600',
    }));
  }, [testHistory]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-2">No recent activities yet</p>
            <p className="text-sm text-gray-500">
              Start learning to see your progress here!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onClick={() => {
                  if (activity.type === 'test') {
                    navigate(`/tests/results/${activity.id}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  activity: Activity;
  onClick?: () => void;
}

function ActivityItem({ activity, onClick }: ActivityItemProps) {
  return (
    <div
      className={`flex items-start gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} p-2 rounded-lg transition-colors`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
        {activity.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
        <p className={`text-sm ${activity.color}`}>{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
