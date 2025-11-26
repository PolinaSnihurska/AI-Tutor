import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ParentAnalytics } from '@ai-tutor/shared-types';
import { parentApi } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { PerformanceChart, SubjectPerformanceChart } from '../../components/analytics';

export function ProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!childId) {
      navigate('/parent/dashboard');
    }
  }, [childId, navigate]);

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery<ParentAnalytics>({
    queryKey: ['parent', 'analytics', childId, dateRange],
    queryFn: () => parentApi.getChildAnalytics(childId!, dateRange.start, dateRange.end),
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
        <ErrorMessage message="Failed to load analytics. Please try again." />
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Child Progress Report</h1>
          <p className="text-gray-600 mt-2">
            Detailed performance metrics and analytics
          </p>
        </div>

        {/* Date Range Selector */}
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
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() =>
                    setDateRange({
                      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      end: new Date().toISOString().split('T')[0],
                    })
                  }
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() =>
                    setDateRange({
                      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      end: new Date().toISOString().split('T')[0],
                    })
                  }
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  Last 30 Days
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Comparison */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.comparisonToGoals.currentScore}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Current Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {analytics.comparisonToGoals.targetScore}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Target Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.comparisonToGoals.daysRemaining}
                </div>
                <div className="text-sm text-gray-600 mt-1">Days Remaining</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    analytics.comparisonToGoals.onTrack
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {analytics.comparisonToGoals.onTrack ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {analytics.comparisonToGoals.onTrack ? 'On Track' : 'Needs Attention'}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${
                    analytics.comparisonToGoals.onTrack
                      ? 'bg-green-600'
                      : 'bg-yellow-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      (analytics.comparisonToGoals.currentScore /
                        analytics.comparisonToGoals.targetScore) *
                        100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance by Subject */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectPerformanceChart subjects={analytics.performanceBySubject} />
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recommendations.length === 0 ? (
              <p className="text-gray-600">No recommendations at this time.</p>
            ) : (
              <ul className="space-y-2">
                {analytics.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
