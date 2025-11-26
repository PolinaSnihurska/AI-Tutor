import React, { useState } from 'react';
import { Activity, Server, Users, TrendingUp, Database, AlertCircle } from 'lucide-react';

type MonitoringTab = 'services' | 'activity' | 'subscriptions' | 'ai' | 'system';

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('services');

  const tabs = [
    { id: 'services' as MonitoringTab, name: 'Service Health', icon: Server },
    { id: 'activity' as MonitoringTab, name: 'User Activity', icon: Users },
    { id: 'subscriptions' as MonitoringTab, name: 'Subscriptions', icon: TrendingUp },
    { id: 'ai' as MonitoringTab, name: 'AI Usage', icon: Activity },
    { id: 'system' as MonitoringTab, name: 'System', icon: Database },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
        <p className="text-gray-600 mt-2">Monitor platform health, usage, and performance</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'services' && <ServiceHealthTab />}
          {activeTab === 'activity' && <UserActivityTab />}
          {activeTab === 'subscriptions' && <SubscriptionsTab />}
          {activeTab === 'ai' && <AIUsageTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
};

const ServiceHealthTab: React.FC = () => {
  const services = [
    { name: 'Auth Service', status: 'healthy', responseTime: 45, uptime: 99.9 },
    { name: 'AI Service', status: 'healthy', responseTime: 120, uptime: 99.5 },
    { name: 'Test Service', status: 'healthy', responseTime: 35, uptime: 99.8 },
    { name: 'Analytics Service', status: 'healthy', responseTime: 55, uptime: 99.7 },
    { name: 'Learning Plan Service', status: 'healthy', responseTime: 40, uptime: 99.9 },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Service Health Status</h2>
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600">Response time: {service.responseTime}ms</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-green-600">Healthy</span>
              <p className="text-xs text-gray-500">{service.uptime}% uptime</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Activity className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">All Systems Operational</h3>
            <p className="text-sm text-green-800 mt-1">All services are running normally with no reported issues.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserActivityTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">User Activity Monitoring</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Daily Active Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">1,234</p>
          <p className="text-sm text-green-600 mt-1">↑ 12% from yesterday</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">New Signups (24h)</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">45</p>
          <p className="text-sm text-green-600 mt-1">↑ 8% from yesterday</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Avg Session Duration</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">24 min</p>
          <p className="text-sm text-gray-600 mt-1">Stable</p>
        </div>
      </div>
      <div className="text-gray-600">
        <p className="mb-4">Track user engagement and activity patterns:</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Daily and monthly active user trends</li>
          <li>New user registration rates</li>
          <li>Session duration and engagement metrics</li>
          <li>Peak usage times and patterns</li>
        </ul>
      </div>
    </div>
  );
};

const SubscriptionsTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Subscription Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">456</p>
          <p className="text-sm text-green-600 mt-1">↑ 15% this month</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Monthly Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">$4,556</p>
          <p className="text-sm text-green-600 mt-1">↑ 18% this month</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Churn Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">2.3%</p>
          <p className="text-sm text-green-600 mt-1">↓ 0.5% this month</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Free Tier</h3>
            <span className="text-sm text-gray-600">1,234 users</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Premium</h3>
            <span className="text-sm text-gray-600">356 users</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '20%' }}></div>
          </div>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900">Family</h3>
            <span className="text-sm text-gray-600">100 users</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIUsageTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">AI Usage Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Total Queries (30d)</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">12,456</p>
          <p className="text-sm text-green-600 mt-1">↑ 25% from last month</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">1.2s</p>
          <p className="text-sm text-green-600 mt-1">Within target</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Error Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">0.3%</p>
          <p className="text-sm text-green-600 mt-1">Below threshold</p>
        </div>
      </div>
      <div className="text-gray-600">
        <p className="mb-4">Monitor AI service performance and usage:</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Query volume by subscription tier</li>
          <li>Response time trends and performance</li>
          <li>Error rates and failure analysis</li>
          <li>Most requested topics and subjects</li>
          <li>Cache hit rates and optimization opportunities</li>
        </ul>
      </div>
    </div>
  );
};

const SystemTab: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">System Performance</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Database Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Users Table</span>
              <span className="text-sm font-medium text-gray-900">1,234 rows • 2.5 MB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Test Results</span>
              <span className="text-sm font-medium text-gray-900">5,678 rows • 12.3 MB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Analytics Snapshots</span>
              <span className="text-sm font-medium text-gray-900">3,456 rows • 8.7 MB</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Recent Errors</h3>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-900">No critical errors in the last 24 hours</p>
                <p className="text-xs text-yellow-800 mt-1">System is operating normally</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Cache Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">87%</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">245 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
