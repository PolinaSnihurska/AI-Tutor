import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { parentApi, ActivityLog } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';

export function ActivityLogPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [limit, setLimit] = useState(100);

  useEffect(() => {
    if (!childId) {
      navigate('/parent/dashboard');
    }
  }, [childId, navigate]);

  const {
    data: activities = [],
    isLoading,
    error,
  } = useQuery<ActivityLog[]>({
    queryKey: ['parent', 'activity-log', childId, dateRange, limit],
    queryFn: () =>
      parentApi.getActivityLog(childId!, dateRange.start, dateRange.end, limit),
    enabled: !!childId,
  });

  if (!childId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message="Failed to load activity log. Please try again." />
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'test_completed':
        return '📝';
      case 'lesson_completed':
        return '📚';
      case 'ai_query':
        return '💬';
      case 'learning_plan_updated':
        return '📋';
      default:
        return '📌';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'test_completed':
        return 'Test Completed';
      case 'lesson_completed':
        return 'Lesson Completed';
      case 'ai_query':
        return 'AI Query';
      case 'learning_plan_updated':
        return 'Learning Plan Updated';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-2">
            Review all learning activities and interactions
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limit
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50}>50 activities</option>
                  <option value={100}>100 activities</option>
                  <option value={200}>200 activities</option>
                  <option value={500}>500 activities</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle>Activities ({activities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activities found for the selected period.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 border rounded-lg ${
                      activity.flagged
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-white'
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">
                        {getActivityIcon(activity.activityType)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {getActivityLabel(activity.activityType)}
                          </h4>
                          <span className="text-sm text-gray-600">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          {activity.activityDetails.subject && (
                            <div>
                              <span className="font-medium">Subject:</span>{' '}
                              {activity.activityDetails.subject}
                            </div>
                          )}
                          {activity.activityDetails.score !== undefined && (
                            <div>
                              <span className="font-medium">Score:</span>{' '}
                              <span
                                className={`font-semibold ${
                                  activity.activityDetails.score >= 80
                                    ? 'text-green-600'
                                    : activity.activityDetails.score >= 60
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {activity.activityDetails.score}%
                              </span>
                            </div>
                          )}
                          {activity.durationMinutes > 0 && (
                            <div>
                              <span className="font-medium">Duration:</span>{' '}
                              {formatDuration(activity.durationMinutes)}
                            </div>
                          )}
                          {activity.flagged && activity.flagReason && (
                            <div className="mt-2 p-2 bg-red-100 rounded">
                              <span className="font-medium text-red-800">
                                ⚠️ Flagged:
                              </span>{' '}
                              <span className="text-red-700">
                                {activity.flagReason}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
