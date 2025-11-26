import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChildProfile } from '@ai-tutor/shared-types';
import { parentApi } from '../../lib/api';
import { Loading, ErrorMessage } from '../../components/ui';
import {
  ChildSelector,
  ChildOverviewCard,
  NotificationCenter,
  QuickReports,
} from '../../components/parent';

// Mock notifications for now - in production, these would come from an API
const mockNotifications = [
  {
    id: '1',
    type: 'alert' as const,
    title: 'Low Performance Alert',
    message: 'Math score has dropped below 70% this week',
    timestamp: new Date(Date.now() - 3600000),
    childName: 'John',
    read: false,
  },
  {
    id: '2',
    type: 'success' as const,
    title: 'Goal Achieved',
    message: 'Completed all weekly tasks!',
    timestamp: new Date(Date.now() - 7200000),
    childName: 'Sarah',
    read: false,
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Study Reminder',
    message: 'Daily study time goal not met yesterday',
    timestamp: new Date(Date.now() - 86400000),
    childName: 'John',
    read: true,
  },
];

export function ParentDashboardPage() {
  const navigate = useNavigate();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(mockNotifications);

  // Fetch children
  const {
    data: children = [],
    isLoading: isLoadingChildren,
    error: childrenError,
  } = useQuery<ChildProfile[]>({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
  });

  // Auto-select first child if available
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleViewDetails = (childId: string) => {
    setSelectedChildId(childId);
    navigate(`/parent/analytics/progress?childId=${childId}`);
  };

  const handleNavigate = (path: string) => {
    if (selectedChildId) {
      navigate(`${path}?childId=${selectedChildId}`);
    }
  };

  if (isLoadingChildren) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (childrenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message="Failed to load children. Please try again." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor your children's learning progress
          </p>
        </div>

        {/* Child Selector */}
        <div className="mb-6">
          <ChildSelector
            children={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            isLoading={isLoadingChildren}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Children Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Children Overview Cards */}
            {children.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Your Children
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {children.map((child) => (
                    <ChildOverviewCard
                      key={child.id}
                      child={child}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Reports */}
            <QuickReports
              selectedChildId={selectedChildId}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Right Column - Notifications */}
          <div className="lg:col-span-1">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
