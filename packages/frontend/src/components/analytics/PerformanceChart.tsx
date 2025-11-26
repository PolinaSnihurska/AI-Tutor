import { Progress } from '../../lib/api/analyticsApi';

interface PerformanceChartProps {
  progress?: Progress;
}

export function PerformanceChart({ progress }: PerformanceChartProps) {
  if (!progress) {
    return <div className="text-gray-500 text-center py-8">No data available</div>;
  }

  const { overallScore, testsCompleted, consistency } = progress;

  return (
    <div className="space-y-6">
      {/* Overall Score Display */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="#e5e7eb"
              strokeWidth="16"
              fill="none"
            />
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke={overallScore >= 70 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${(overallScore / 100) * 502.4} 502.4`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{overallScore}%</span>
            <span className="text-sm text-gray-500">Overall Score</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{testsCompleted}</div>
          <div className="text-sm text-blue-700">Tests Completed</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{consistency}%</div>
          <div className="text-sm text-green-700">Consistency</div>
        </div>
      </div>
    </div>
  );
}
