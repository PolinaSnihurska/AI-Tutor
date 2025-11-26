import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api/analyticsApi';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui';
import { useNavigate } from 'react-router-dom';

export function ProgressSummaryCard() {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useQuery({
    queryKey: ['progress', 'current'],
    queryFn: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return analyticsApi.getProgress(undefined, {
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No progress data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const scoreColor =
    progress.overallScore >= 80
      ? 'text-green-600'
      : progress.overallScore >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  const trendIcon =
    progress.improvementRate > 0 ? '↗' : progress.improvementRate < 0 ? '↘' : '→';
  const trendColor =
    progress.improvementRate > 0
      ? 'text-green-600'
      : progress.improvementRate < 0
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-6">
          <div className={`text-5xl font-bold ${scoreColor} mb-2`}>
            {progress.overallScore.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-600">Overall Performance</p>
          <div className={`flex items-center justify-center gap-1 mt-2 ${trendColor}`}>
            <span className="text-xl">{trendIcon}</span>
            <span className="text-sm font-medium">
              {Math.abs(progress.improvementRate).toFixed(1)}% this month
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <StatItem
            label="Tests Completed"
            value={progress.testsCompleted.toString()}
            icon="📝"
          />
          <StatItem
            label="Study Time"
            value={`${Math.floor(progress.studyTime / 60)}h ${progress.studyTime % 60}m`}
            icon="⏱️"
          />
          <StatItem
            label="Consistency"
            value={`${progress.consistency.toFixed(0)}%`}
            icon="🎯"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate('/analytics')}
        >
          View Detailed Analytics
        </Button>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: string;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
