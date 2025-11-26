import { useState } from 'react';
import { Heatmap } from '../../lib/api/analyticsApi';

interface HeatmapVisualizationProps {
  heatmap?: Heatmap;
  onTopicClick?: (subject: string, topic: string) => void;
}

export function HeatmapVisualization({ heatmap, onTopicClick }: HeatmapVisualizationProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  if (!heatmap || !heatmap.subjects || heatmap.subjects.length === 0) {
    return <div className="text-gray-500 text-center py-8">No heatmap data available</div>;
  }

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate >= 70) return 'bg-red-600';
    if (errorRate >= 50) return 'bg-red-400';
    if (errorRate >= 30) return 'bg-yellow-400';
    if (errorRate >= 15) return 'bg-green-400';
    return 'bg-green-600';
  };

  const getErrorRateLabel = (errorRate: number) => {
    if (errorRate >= 70) return 'Critical';
    if (errorRate >= 50) return 'High';
    if (errorRate >= 30) return 'Moderate';
    if (errorRate >= 15) return 'Low';
    return 'Excellent';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
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

  const displaySubjects = selectedSubject
    ? heatmap.subjects.filter((s) => s.subject === selectedSubject)
    : heatmap.subjects;

  return (
    <div className="space-y-6">
      {/* Subject Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSubject(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSubject === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Subjects
        </button>
        {heatmap.subjects.map((subject) => (
          <button
            key={subject.subject}
            onClick={() => setSelectedSubject(subject.subject)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSubject === subject.subject
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {subject.subject}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-gray-700">Error Rate:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span className="text-gray-600">Excellent (&lt;15%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span className="text-gray-600">Low (15-30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded" />
          <span className="text-gray-600">Moderate (30-50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span className="text-gray-600">High (50-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span className="text-gray-600">Critical (&gt;70%)</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      {displaySubjects.map((subject) => (
        <div key={subject.subject} className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">{subject.subject}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {subject.topics.map((topic) => (
              <button
                key={topic.topic}
                onClick={() => onTopicClick?.(subject.subject, topic.topic)}
                className={`${getErrorRateColor(
                  topic.errorRate
                )} rounded-lg p-4 text-white hover:opacity-90 transition-opacity cursor-pointer text-left`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium opacity-90">
                    {getErrorRateLabel(topic.errorRate)}
                  </span>
                  {getTrendIcon(topic.trend)}
                </div>
                <div className="text-sm font-semibold mb-1 line-clamp-2">{topic.topic}</div>
                <div className="text-xs opacity-90">{topic.errorRate}% errors</div>
                <div className="text-xs opacity-75 mt-1">{topic.attemptsCount} attempts</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Drill-down Info */}
      {selectedSubject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Viewing {selectedSubject} topics
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Click on any topic to see detailed performance and recommendations
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
