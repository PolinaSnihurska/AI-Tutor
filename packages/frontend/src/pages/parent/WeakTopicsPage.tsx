import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ParentAnalytics } from '@ai-tutor/shared-types';
import { parentApi } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { HeatmapVisualization } from '../../components/analytics';
import { analyticsApi } from '../../lib/api';

export function WeakTopicsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');

  const [dateRange] = useState({
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
    isLoading: isLoadingAnalytics,
    error: analyticsError,
  } = useQuery<ParentAnalytics>({
    queryKey: ['parent', 'analytics', childId, dateRange],
    queryFn: () => parentApi.getChildAnalytics(childId!, dateRange.start, dateRange.end),
    enabled: !!childId,
  });

  const {
    data: heatmap,
    isLoading: isLoadingHeatmap,
    error: heatmapError,
  } = useQuery({
    queryKey: ['heatmap', childId],
    queryFn: () => analyticsApi.getHeatmap(childId!),
    enabled: !!childId,
  });

  if (!childId) {
    return null;
  }

  const isLoading = isLoadingAnalytics || isLoadingHeatmap;
  const error = analyticsError || heatmapError;

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
        <ErrorMessage message="Failed to load weak topics data. Please try again." />
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
          <h1 className="text-3xl font-bold text-gray-900">Weak Topics Analysis</h1>
          <p className="text-gray-600 mt-2">
            Identify areas needing improvement and track progress
          </p>
        </div>

        {/* Weak Topics Alert */}
        {analytics.weakTopics.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                Areas Needing Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.weakTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📚</span>
                      <span className="font-medium text-gray-900">{topic}</span>
                    </div>
                    <span className="text-sm text-red-600 font-semibold">
                      Needs Practice
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Heatmap */}
        {heatmap && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <HeatmapVisualization heatmap={heatmap} />
            </CardContent>
          </Card>
        )}

        {/* Subject Performance Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.performanceBySubject.map((subject) => (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {subject.subject}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {subject.testsCompleted} tests
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          subject.trend === 'improving'
                            ? 'text-green-600'
                            : subject.trend === 'declining'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {subject.trend === 'improving'
                          ? '↗ Improving'
                          : subject.trend === 'declining'
                          ? '↘ Declining'
                          : '→ Stable'}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {subject.score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        subject.score >= 80
                          ? 'bg-green-600'
                          : subject.score >= 60
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${subject.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Improvement Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recommendations.length === 0 ? (
              <p className="text-gray-600">
                Great job! No specific recommendations at this time.
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg"
                  >
                    <span className="text-blue-600 text-xl">💡</span>
                    <p className="text-gray-700 flex-1">{rec}</p>
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
