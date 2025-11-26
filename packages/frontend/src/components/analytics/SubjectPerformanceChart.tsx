interface SubjectScore {
  subject: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

interface SubjectPerformanceChartProps {
  subjectScores: SubjectScore[];
}

export function SubjectPerformanceChart({ subjectScores }: SubjectPerformanceChartProps) {
  if (!subjectScores || subjectScores.length === 0) {
    return <div className="text-gray-500 text-center py-8">No subject data available</div>;
  }

  const maxScore = Math.max(...subjectScores.map((s) => s.score), 100);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {subjectScores.map((subject) => (
        <div key={subject.subject} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{subject.subject}</span>
              {getTrendIcon(subject.trend)}
            </div>
            <span className="text-sm font-semibold text-gray-900">{subject.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${getScoreColor(subject.score)} transition-all duration-500`}
              style={{ width: `${(subject.score / maxScore) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
