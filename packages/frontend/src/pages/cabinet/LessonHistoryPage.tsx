import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { testApi } from '../../lib/api/testApi';
import { Card, CardContent, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

interface LessonActivity {
  id: string;
  type: 'test' | 'explanation' | 'practice';
  title: string;
  subject: string;
  date: Date;
  duration: number;
  score?: number;
  topics: string[];
}

export function LessonHistoryPage() {
  const navigate = useNavigate();
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const { data: testHistory, isLoading } = useQuery({
    queryKey: ['testHistory'],
    queryFn: () => testApi.getTestHistory(),
  });

  // Transform test history into lesson activities
  const activities: LessonActivity[] = testHistory?.map((result) => ({
    id: result.id,
    type: 'test' as const,
    title: `Test Completed`,
    subject: 'General', // Would come from test metadata
    date: new Date(),
    duration: result.timeSpent,
    score: result.percentage,
    topics: result.weakTopics || [],
  })) || [];

  const filteredActivities = activities.filter((activity) => {
    if (filterSubject !== 'all' && activity.subject !== filterSubject) return false;
    if (filterType !== 'all' && activity.type !== filterType) return false;
    return true;
  });

  const subjects = Array.from(new Set(activities.map((a) => a.subject)));

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Lesson History</h1>
          <p className="text-gray-600 mt-2">
            Review your past learning activities and progress
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="test">Tests</option>
                  <option value="explanation">Explanations</option>
                  <option value="practice">Practice</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No activities found
              </h2>
              <p className="text-gray-600 mb-6">
                Start learning to build your history!
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityCardProps {
  activity: LessonActivity;
}

function ActivityCard({ activity }: ActivityCardProps) {
  const navigate = useNavigate();

  const typeConfig = {
    test: { icon: '📝', color: 'bg-blue-100 text-blue-800', label: 'Test' },
    explanation: { icon: '💡', color: 'bg-purple-100 text-purple-800', label: 'Explanation' },
    practice: { icon: '✏️', color: 'bg-green-100 text-green-800', label: 'Practice' },
  };

  const config = typeConfig[activity.type];

  const handleClick = () => {
    if (activity.type === 'test') {
      navigate(`/tests/results/${activity.id}`);
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                📚 {activity.subject}
              </span>
              <span className="flex items-center gap-1">
                📅 {activity.date.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                ⏱️ {Math.floor(activity.duration / 60)}m {activity.duration % 60}s
              </span>
              {activity.score !== undefined && (
                <span
                  className={`flex items-center gap-1 font-medium ${
                    activity.score >= 70 ? 'text-green-600' : 'text-yellow-600'
                  }`}
                >
                  🎯 {activity.score.toFixed(0)}%
                </span>
              )}
            </div>
            {activity.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activity.topics.slice(0, 3).map((topic, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                  >
                    {topic}
                  </span>
                ))}
                {activity.topics.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    +{activity.topics.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
