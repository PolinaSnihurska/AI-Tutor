interface StudyTimeChartProps {
  studyTime: number; // in minutes
}

export function StudyTimeChart({ studyTime }: StudyTimeChartProps) {
  const hours = Math.floor(studyTime / 60);
  const minutes = studyTime % 60;

  // Calculate daily average (assuming 30-day period)
  const dailyAverage = Math.round(studyTime / 30);
  const dailyHours = Math.floor(dailyAverage / 60);
  const dailyMinutes = dailyAverage % 60;

  // Mock weekly data for visualization (in real app, this would come from API)
  const weeklyData = [
    { day: 'Mon', minutes: Math.round(studyTime / 30) },
    { day: 'Tue', minutes: Math.round(studyTime / 28) },
    { day: 'Wed', minutes: Math.round(studyTime / 32) },
    { day: 'Thu', minutes: Math.round(studyTime / 29) },
    { day: 'Fri', minutes: Math.round(studyTime / 31) },
    { day: 'Sat', minutes: Math.round(studyTime / 27) },
    { day: 'Sun', minutes: Math.round(studyTime / 33) },
  ];

  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 60);

  return (
    <div className="space-y-6">
      {/* Total Study Time */}
      <div className="text-center">
        <div className="text-4xl font-bold text-gray-900">
          {hours}h {minutes}m
        </div>
        <div className="text-sm text-gray-500 mt-1">Total Study Time</div>
      </div>

      {/* Daily Average */}
      <div className="bg-blue-50 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-blue-900">
          {dailyHours > 0 ? `${dailyHours}h ` : ''}
          {dailyMinutes}m
        </div>
        <div className="text-sm text-blue-700">Daily Average</div>
      </div>

      {/* Weekly Bar Chart */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">This Week</div>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyData.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-200 rounded-t-lg relative flex-1 flex items-end">
                <div
                  className="w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                  style={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                  title={`${day.minutes} minutes`}
                />
              </div>
              <span className="text-xs text-gray-600">{day.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
