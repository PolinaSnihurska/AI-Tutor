import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { analyticsApi } from '../../lib/api/analyticsApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import {
  PerformanceChart,
  SubjectPerformanceChart,
  StudyTimeChart,
  ImprovementIndicator,
  HeatmapVisualization,
  PredictionDisplay,
} from '../../components/analytics';

export function AnalyticsPage() {
  const user = useSelector((state: RootState) => (state as any).auth?.user);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  const { data: progress, isLoading, error } = useQuery({
    queryKey: ['progress', user?.id, dateRange],
    queryFn: () => analyticsApi.getProgress(user?.id, dateRange),
    enabled: !!user?.id,
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery({
    queryKey: ['heatmap', user?.id],
    queryFn: () => analyticsApi.getHeatmap(user?.id),
    enabled: !!user?.id,
  });

  const { data: prediction, isLoading: predictionLoading } = useQuery({
    queryKey: ['prediction', user?.id],
    queryFn: () => analyticsApi.getPrediction(user?.id, 'NMT'),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <ErrorMessage message="Failed to load analytics data" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your progress and performance</p>
        </div>

        {/* Date Range Selector */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Time Period:</label>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => {
                  const days = parseInt(e.target.value);
                  setDateRange({
                    start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString(),
                  });
                }}
              >
                <option value="7">Last 7 days</option>
                <option value="30" selected>
                  Last 30 days
                </option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Overall Performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceChart progress={progress} />
          </CardContent>
        </Card>

        {/* Subject Performance and Study Time */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <SubjectPerformanceChart subjectScores={progress?.subjectScores || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Time</CardTitle>
            </CardHeader>
            <CardContent>
              <StudyTimeChart studyTime={progress?.studyTime || 0} />
            </CardContent>
          </Card>
        </div>

        {/* Improvement Indicators */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progress Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <ImprovementIndicator progress={progress} />
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Heatmap</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Identify topics where you need more practice
            </p>
          </CardHeader>
          <CardContent>
            {heatmapLoading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : (
              <HeatmapVisualization
                heatmap={heatmap}
                onTopicClick={(subject, topic) => {
                  console.log('Topic clicked:', subject, topic);
                  // TODO: Navigate to topic detail or show modal
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Prediction and Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Success Prediction & Insights</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered predictions based on your performance
            </p>
          </CardHeader>
          <CardContent>
            {predictionLoading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : (
              <PredictionDisplay prediction={prediction} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
