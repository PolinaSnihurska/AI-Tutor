import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testApi } from '../../lib/api/testApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export function TestResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [showExplanations, setShowExplanations] = useState(true);

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['testResult', resultId],
    queryFn: () => testApi.getTestResult(resultId!),
    enabled: !!resultId,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message="Failed to load test results" />;
  if (!result) return <ErrorMessage message="Test result not found" />;

  const passed = result.percentage >= 70; // Assuming 70% is passing
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Results Summary */}
        <Card className="mb-6">
          <div className="text-center py-8">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                passed ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {passed ? (
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h1>
            <p className="text-gray-600 mb-6">
              {passed
                ? 'You passed the test!'
                : "Don't worry, you'll do better next time!"}
            </p>

            <div className="flex justify-center items-center gap-2 mb-8">
              <span className="text-6xl font-bold text-gray-900">
                {result.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {result.score.toFixed(0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Correct</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Incorrect</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.totalQuestions - result.correctAnswers}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(result.timeSpent)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Weak Topics */}
        {result.weakTopics && result.weakTopics.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Focus on these topics to improve your performance:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.weakTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Question Review */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question Review</CardTitle>
              <button
                onClick={() => setShowExplanations(!showExplanations)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showExplanations ? 'Hide' : 'Show'} Explanations
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {result.detailedResults.map((questionResult, idx) => (
                <QuestionReview
                  key={questionResult.questionId}
                  questionNumber={idx + 1}
                  result={questionResult}
                  showExplanation={showExplanations}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/test')} variant="outline">
            Browse Tests
          </Button>
          <Button onClick={() => navigate('/test/history')} variant="outline">
            View History
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="primary">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

interface QuestionReviewProps {
  questionNumber: number;
  result: {
    questionId: string;
    correct: boolean;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    explanation: string;
  };
  showExplanation: boolean;
}

function QuestionReview({
  questionNumber,
  result,
  showExplanation,
}: QuestionReviewProps) {
  const formatAnswer = (answer: string | string[]) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return answer;
  };

  return (
    <div
      className={`border-l-4 pl-4 ${
        result.correct ? 'border-green-500' : 'border-red-500'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
            result.correct
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {questionNumber}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {result.correct ? (
              <span className="text-green-700 font-medium">Correct</span>
            ) : (
              <span className="text-red-700 font-medium">Incorrect</span>
            )}
          </div>
        </div>
      </div>

      <div className="ml-11 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
          <p
            className={`text-gray-900 ${
              result.correct ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {formatAnswer(result.userAnswer) || '(No answer provided)'}
          </p>
        </div>

        {!result.correct && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Correct Answer:
            </p>
            <p className="text-green-700">{formatAnswer(result.correctAnswer)}</p>
          </div>
        )}

        {showExplanation && result.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Explanation:</p>
            <p className="text-sm text-blue-800">{result.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
