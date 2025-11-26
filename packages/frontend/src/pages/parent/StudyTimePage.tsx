import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { parentApi, LearningTimeData } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { StudyTimeChart } from '../../components/analytics';

export function StudyTimePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!childId) {
      navigate('/parent/dashboard');
    }
  }, [childId, navigate]);

  const {
    data: learningTime,
    isLoading,
    error,
  } = useQuery<LearningTimeData>({
    queryKey: ['parent', 'learning-time', childId, days],
    queryFn: () => parentApi.getLearningTime(childId!, days),
    enabled: !!childId,
  });

  if (!childId) {
    return null;
  }

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
        <ErrorMessage message="Failed to load study time data. Please try again." />
      </div>
    );
  }

  if (!learningTime) {
    return null;
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Study Time Report</h1>
          <p className="text-gray-600 mt-2">
            Monitor daily and weekly study patterns
          </p>
        </div>

        {/* Time Period Selector */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={() => setDays(7)}
                className={`px-4 py-2 rounded-lg ${
                  days === 7
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDays(14)}
                className={`px-4 py-2 rounded-lg ${
                  days === 14
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Last 14 Days
              </button>
              <button
                onClick={() => setDays(30)}
                className={`px-4 py-2 rounded-lg ${
                  days === 30
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Study Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatMinutes(learningTime.totalMinutes)}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Over the last {days} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatMinutes(learningTime.averageMinutesPerDay)}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Average per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Limit Status</CardTitle>
            </CardHeader>
            <CardContent>
              {learningTime.timeLimit.limitMinutes ? (
                <>
                  <div
                    className={`text-3xl font-bold ${
                      learningTime.timeLimit.exceeded
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {learningTime.timeLimit.exceeded ? 'Exceeded' : 'Within Limit'}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {formatMinutes(learningTime.timeLimit.usedMinutes)} /{' '}
                    {formatMinutes(learningTime.timeLimit.limitMinutes)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-600">No Limit</div>
                  <p className="text-sm text-gray-600 mt-2">
                    No daily time limit set
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Study Time Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyTimeChart
              data={learningTime.dailyData.map((d) => ({
                date: d.date,
                minutes: d.minutes,
              }))}
            />
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Study Time
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Activities
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {learningTime.dailyData.map((day) => (
                    <tr key={day.date} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatMinutes(day.minutes)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {day.activities} activities
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
