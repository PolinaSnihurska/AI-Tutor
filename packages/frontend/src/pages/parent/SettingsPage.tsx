import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentApi, NotificationPreferences } from '../../lib/api';
import { Loading, ErrorMessage, Card, CardHeader, CardTitle, CardContent, useToast } from '../../components/ui';

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    inApp: true,
    taskReminders: true,
    weeklyReports: true,
    performanceAlerts: true,
    dailySummary: false,
  });

  const {
    data: currentPreferences,
    isLoading,
    error,
  } = useQuery<NotificationPreferences>({
    queryKey: ['parent', 'notification-preferences'],
    queryFn: parentApi.getNotificationPreferences,
  });

  useEffect(() => {
    if (currentPreferences) {
      setPreferences(currentPreferences);
    }
  }, [currentPreferences]);

  const updateMutation = useMutation({
    mutationFn: (data: NotificationPreferences) =>
      parentApi.updateNotificationPreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['parent', 'notification-preferences'],
      });
      showToast('success', 'Notification preferences updated successfully');
    },
    onError: () => {
      showToast('error', 'Failed to update notification preferences');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(preferences);
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
        <ErrorMessage message="Failed to load notification preferences. Please try again." />
      </div>
    );
  }

  const notificationSettings = [
    {
      key: 'email' as const,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
    },
    {
      key: 'inApp' as const,
      title: 'In-App Notifications',
      description: 'Show notifications within the application',
    },
    {
      key: 'taskReminders' as const,
      title: 'Task Reminders',
      description: 'Get reminders about upcoming tasks and deadlines',
    },
    {
      key: 'weeklyReports' as const,
      title: 'Weekly Reports',
      description: 'Receive weekly progress reports for your children',
    },
    {
      key: 'performanceAlerts' as const,
      title: 'Performance Alerts',
      description: 'Get notified about significant performance changes',
    },
    {
      key: 'dailySummary' as const,
      title: 'Daily Summary',
      description: 'Receive a daily summary of learning activities',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/parent/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure your notification preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notificationSettings.map((setting) => (
                  <label
                    key={setting.key}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={preferences[setting.key]}
                      onChange={() => handleToggle(setting.key)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {setting.title}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {setting.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => navigate('/parent/children/link')}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      Link Child Account
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Connect a new child account to monitor
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/parent/children/manage')}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      Manage Children
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      View and manage linked child accounts
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/parent/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
