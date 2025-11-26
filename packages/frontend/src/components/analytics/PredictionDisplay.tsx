import { Prediction } from '../../lib/api/analyticsApi';

interface PredictionDisplayProps {
  prediction?: Prediction;
}

export function PredictionDisplay({ prediction }: PredictionDisplayProps) {
  if (!prediction) {
    return <div className="text-gray-500 text-center py-8">No prediction data available</div>;
  }

  const { predictedScore, confidence, factors, recommendations } = prediction;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'green';
    if (conf >= 60) return 'blue';
    if (conf >= 40) return 'yellow';
    return 'red';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  const confidenceColor = getConfidenceColor(confidence);
  const scoreColor = getScoreColor(predictedScore);

  return (
    <div className="space-y-6">
      {/* Prediction Score */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={`bg-${scoreColor}-50 rounded-lg p-6 border border-${scoreColor}-200`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="text-sm font-medium text-gray-600">Predicted Score</div>
              <div className={`text-4xl font-bold text-${scoreColor}-900`}>
                {predictedScore}%
              </div>
            </div>
          </div>
          <div className={`text-sm text-${scoreColor}-700 mt-2`}>
            Based on your current performance trajectory
          </div>
        </div>

        <div className={`bg-${confidenceColor}-50 rounded-lg p-6 border border-${confidenceColor}-200`}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📊</span>
            <div>
              <div className="text-sm font-medium text-gray-600">Confidence Level</div>
              <div className={`text-4xl font-bold text-${confidenceColor}-900`}>
                {confidence}%
              </div>
            </div>
          </div>
          <div className={`text-sm text-${confidenceColor}-700 mt-2`}>
            Prediction reliability score
          </div>
        </div>
      </div>

      {/* Factor Analysis */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Factors</h4>
        <div className="space-y-3">
          {factors.map((factor, index) => {
            const impactColor =
              factor.impact > 0.5
                ? 'green'
                : factor.impact > 0
                ? 'blue'
                : factor.impact > -0.5
                ? 'yellow'
                : 'red';
            const impactWidth = Math.abs(factor.impact) * 100;

            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{factor.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{factor.description}</div>
                  </div>
                  <div
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      factor.impact > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {factor.impact > 0 ? '+' : ''}
                    {(factor.impact * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full bg-${impactColor}-500 transition-all duration-500`}
                    style={{ width: `${impactWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
        <div className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <div
              key={index}
              className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-blue-900">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Comparison Chart */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Goal Progress</h4>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Target Score</span>
              <span className="text-sm font-semibold text-gray-900">85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-purple-500"
                style={{ width: '85%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Predicted Score</span>
              <span className="text-sm font-semibold text-gray-900">{predictedScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full bg-${scoreColor}-500`}
                style={{ width: `${predictedScore}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-purple-200">
            {predictedScore >= 85 ? (
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">On track to meet your goal!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {(85 - predictedScore).toFixed(0)}% gap to reach your goal
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
