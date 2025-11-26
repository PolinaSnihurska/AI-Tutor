import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Users, DollarSign, Activity, TrendingUp, Brain, FileText } from 'lucide-react';

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        {trend && <p className="text-sm text-green-600 mt-1">{trend}</p>}
      </div>
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: adminApi.getMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load dashboard metrics</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of platform metrics and activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers.toLocaleString() || 0}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          color="bg-blue-100"
        />

        <MetricCard
          title="Active Users (30d)"
          value={metrics?.activeUsers.toLocaleString() || 0}
          icon={<Activity className="w-6 h-6 text-green-600" />}
          color="bg-green-100"
        />

        <MetricCard
          title="Premium Subscriptions"
          value={metrics?.totalSubscriptions.toLocaleString() || 0}
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          color="bg-purple-100"
        />

        <MetricCard
          title="Monthly Revenue"
          value={`$${metrics?.revenue.toFixed(2) || 0}`}
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
          color="bg-emerald-100"
        />

        <MetricCard
          title="AI Queries (30d)"
          value={metrics?.aiQueriesTotal.toLocaleString() || 0}
          icon={<Brain className="w-6 h-6 text-indigo-600" />}
          color="bg-indigo-100"
        />

        <MetricCard
          title="Tests Generated (30d)"
          value={metrics?.testsGeneratedTotal.toLocaleString() || 0}
          icon={<FileText className="w-6 h-6 text-orange-600" />}
          color="bg-orange-100"
        />
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage user accounts</p>
          </a>
          <a
            href="/content"
            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Content Management</h3>
            <p className="text-sm text-gray-600 mt-1">Manage tests and learning materials</p>
          </a>
          <a
            href="/monitoring"
            className="p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">System Monitoring</h3>
            <p className="text-sm text-gray-600 mt-1">View system health and analytics</p>
          </a>
        </div>
      </div>
    </div>
  );
};
