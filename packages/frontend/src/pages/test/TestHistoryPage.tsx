import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testApi, TestResult } from '../../lib/api/testApi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export function TestHistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['testHistory'],
    queryFn: () => testApi.getTestHistory(),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message="Failed to load test history" />;

  const filteredHistory = history?.filter((result) => {
    if (filter === 'passed') return result.percentage >= 70;
    if (filter === 'failed') return result.percentage < 70;
    return true;
  });

  const stats = history
    ? {
        total: history.length,
        passed: history.filter((r) => r.percentage >= 70).length,
        failed: history.filter((r) => r.percentage < 70).length,
        avgScore: history.length > 0
          ? history.reduce((sum, r) => sum + r.percentage, 0) / history.length
          : 0,
      }
    : { total: 0, passed: 0, failed: 0, avgScore: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test History</h1>
          <p className="text-gray-600 mt-2">
            Review your past test performances and track your progress
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-sm text-gray-600 mb-1">Total Tests</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-sm text-gray-600 mb-1">Passed</p>
              <p className="text-3xl font-bold text-green-600">{stats.passed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-sm text-gray-600 mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-sm text-gray-600 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats.avgScore.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
            >
              All Tests
            </Button>
            <Button
              onClick={() => setFilter('passed')}
              variant={filter === 'passed' ? 'primary' : 'outline'}
              size="sm"
            >
              Passed
            </Button>
            <Button
              onClick={() => setFilter('failed')}
              variant={filter === 'failed' ? 'primary' : 'outline'}
              size="sm"
            >
              Failed
            </Button>
          </div>
        </Card>

        {/* Test History List */}
        {filteredHistory && filteredHistory.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No test history found</p>
              <Button onClick={() => navigate('/test')}>Take Your First Test</Button>
            </div>
          </Card>
        )}

        {filteredHistory && filteredHistory.length > 0 && (
          <div className="space-y-4">
            {filteredHistory.map((result) => (
              <TestHistoryCard
                key={result.id}
                result={result}
                onViewDetails={() => navigate(`/test/result/${result.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TestHistoryCardProps {
  result: TestResult;
  onViewDetails: () => void;
}

function TestHistoryCard({ result, onViewDetails }: TestHistoryCardProps) {
  const passed = result.percentage >= 70;
  const date = new Date(result.createdAt);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                passed ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <h3 className="text-lg font-semibold text-gray-900">Test #{result.testId.slice(0, 8)}</h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                passed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {passed ? 'Passed' : 'Failed'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{formatDate(date)}</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-600">Score</p>
              <p className="text-lg font-bold text-gray-900">
                {result.percentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Correct</p>
              <p className="text-lg font-bold text-green-600">
                {result.correctAnswers}/{result.totalQuestions}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Time</p>
              <p className="text-lg font-bold text-gray-900">
                {formatTime(result.timeSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Points</p>
              <p className="text-lg font-bold text-gray-900">
                {result.score.toFixed(0)}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Button onClick={onViewDetails} variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </div>
          </div>

          {result.weakTopics && result.weakTopics.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Weak Topics:</p>
              <div className="flex flex-wrap gap-1">
                {result.weakTopics.slice(0, 5).map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded"
                  >
                    {topic}
                  </span>
                ))}
                {result.weakTopics.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{result.weakTopics.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
