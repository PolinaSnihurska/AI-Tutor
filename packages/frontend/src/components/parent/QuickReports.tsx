import { Card, CardHeader, CardTitle, CardContent } from '../ui';

interface QuickReportsProps {
  selectedChildId: string | null;
  onNavigate: (path: string) => void;
}

export function QuickReports({ selectedChildId, onNavigate }: QuickReportsProps) {
  const reports = [
    {
      id: 'progress',
      title: 'Progress Report',
      description: 'View detailed progress and performance metrics',
      icon: '📊',
      path: '/parent/analytics/progress',
    },
    {
      id: 'study-time',
      title: 'Study Time',
      description: 'Monitor daily and weekly study patterns',
      icon: '⏱️',
      path: '/parent/analytics/study-time',
    },
    {
      id: 'weak-topics',
      title: 'Weak Topics',
      description: 'Identify areas needing improvement',
      icon: '🎯',
      path: '/parent/analytics/weak-topics',
    },
    {
      id: 'activity-log',
      title: 'Activity Log',
      description: 'Review all learning activities',
      icon: '📝',
      path: '/parent/activity-log',
    },
    {
      id: 'controls',
      title: 'Parental Controls',
      description: 'Manage time limits and restrictions',
      icon: '🔒',
      path: '/parent/controls',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure notifications and preferences',
      icon: '⚙️',
      path: '/parent/settings',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Access</CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedChildId ? (
          <div className="text-center py-8 text-gray-500">
            Select a child to access reports
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => onNavigate(report.path)}
                className="flex items-start gap-3 p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl">{report.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {report.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {report.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
