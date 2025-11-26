import { Progress } from '../../lib/api/analyticsApi';

interface ImprovementIndicatorProps {
  progress?: Progress;
}

export function ImprovementIndicator({ progress }: ImprovementIndicatorProps) {
  if (!progress) {
    return <div className="text-gray-500 text-center py-8">No data available</div>;
  }

  const { improvementRate, consistency, overallScore } = progress;

  const getImprovementStatus = (rate: number) => {
    if (rate > 10) return { label: 'Excellent', color: 'green', icon: '🚀' };
    if (rate > 5) return { label: 'Good', color: 'blue', icon: '📈' };
    if (rate > 0) return { label: 'Improving', color: 'yellow', icon: '📊' };
    if (rate > -5) return { label: 'Stable', color: 'gray', icon: '➡️' };
    return { label: 'Needs Attention', color: 'red', icon: '⚠️' };
  };

  const getConsistencyStatus = (cons: number) => {
    if (cons >= 80) return { label: 'Very Consistent', color: 'green' };
    if (cons >= 60) return { label: 'Consistent', color: 'blue' };
    if (cons >= 40) return { label: 'Moderate', color: 'yellow' };
    return { label: 'Inconsistent', color: 'red' };
  };

  const improvementStatus = getImprovementStatus(improvementRate);
  const consistencyStatus = getConsistencyStatus(consistency);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Improvement Rate */}
      <div className={`bg-${improvementStatus.color}-50 rounded-lg p-6 border border-${improvementStatus.color}-200`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{improvementStatus.icon}</span>
          <span className={`text-sm font-medium text-${improvementStatus.color}-700`}>
            {improvementStatus.label}
          </span>
        </div>
        <div className={`text-3xl font-bold text-${improvementStatus.color}-900`}>
          {improvementRate > 0 ? '+' : ''}
          {improvementRate}%
        </div>
        <div className={`text-sm text-${improvementStatus.color}-700 mt-1`}>Improvement Rate</div>
      </div>

      {/* Consistency */}
      <div className={`bg-${consistencyStatus.color}-50 rounded-lg p-6 border border-${consistencyStatus.color}-200`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">🎯</span>
          <span className={`text-sm font-medium text-${consistencyStatus.color}-700`}>
            {consistencyStatus.label}
          </span>
        </div>
        <div className={`text-3xl font-bold text-${consistencyStatus.color}-900`}>{consistency}%</div>
        <div className={`text-sm text-${consistencyStatus.color}-700 mt-1`}>Study Consistency</div>
      </div>

      {/* Overall Performance */}
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">⭐</span>
          <span className="text-sm font-medium text-purple-700">
            {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Keep Going'}
          </span>
        </div>
        <div className="text-3xl font-bold text-purple-900">{overallScore}%</div>
        <div className="text-sm text-purple-700 mt-1">Overall Performance</div>
      </div>
    </div>
  );
}
