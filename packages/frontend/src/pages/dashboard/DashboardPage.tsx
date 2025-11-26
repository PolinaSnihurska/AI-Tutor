import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  LearningPlanCard,
  RecentActivitiesCard,
  ProgressSummaryCard,
  AchievementsCard,
  QuickActionsCard,
} from '../../components/dashboard';

export function DashboardPage() {
  // Get profile from Redux store
  const profile = useSelector((state: RootState) => {
    const typedState = state as any;
    return typedState.user?.profile;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.firstName || 'Student'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Ready to continue your learning journey?
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            <LearningPlanCard />
            <RecentActivitiesCard />
          </div>

          {/* Right column - Sidebar */}
          <div className="space-y-6">
            <ProgressSummaryCard />
            <AchievementsCard />
            <QuickActionsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
