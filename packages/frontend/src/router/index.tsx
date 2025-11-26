import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { ProtectedRoute, PublicRoute } from '../components/auth';
import { Loading } from '../components/ui';

// Lazy load pages for code splitting
// Auth pages - loaded immediately as they're entry points
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '../pages/auth';

// Lazy load other pages
const RoleSelection = lazy(() => import('../pages/onboarding/RoleSelection'));
const StudentProfileSetup = lazy(() => import('../pages/onboarding/StudentProfileSetup'));
const ParentProfileSetup = lazy(() => import('../pages/onboarding/ParentProfileSetup'));
const SubscriptionSelection = lazy(() => import('../pages/onboarding/SubscriptionSelection'));

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ParentDashboardPage = lazy(() => import('../pages/dashboard/ParentDashboardPage'));

const TestBrowserPage = lazy(() => import('../pages/test/TestBrowserPage'));
const TestTakingPage = lazy(() => import('../pages/test/TestTakingPage'));
const TestResultPage = lazy(() => import('../pages/test/TestResultPage'));
const TestHistoryPage = lazy(() => import('../pages/test/TestHistoryPage'));

const AnalyticsPage = lazy(() => import('../pages/analytics/AnalyticsPage'));

const ProgressPage = lazy(() => import('../pages/parent/ProgressPage'));
const StudyTimePage = lazy(() => import('../pages/parent/StudyTimePage'));
const WeakTopicsPage = lazy(() => import('../pages/parent/WeakTopicsPage'));
const ActivityLogPage = lazy(() => import('../pages/parent/ActivityLogPage'));
const ControlsPage = lazy(() => import('../pages/parent/ControlsPage'));
const SettingsPage = lazy(() => import('../pages/parent/SettingsPage'));

const PricingPage = lazy(() => import('../pages/subscription/PricingPage'));
const CheckoutPage = lazy(() => import('../pages/subscription/CheckoutPage'));
const SuccessPage = lazy(() => import('../pages/subscription/SuccessPage'));
const SubscriptionManagementPage = lazy(() => import('../pages/subscription/SubscriptionManagementPage'));

// Wrapper component for lazy loaded routes
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading fullScreen />}>
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/verify-email',
    element: (
      <PublicRoute redirectIfAuthenticated={false}>
        <VerifyEmailPage />
      </PublicRoute>
    ),
  },
  {
    path: '/onboarding',
    children: [
      {
        path: 'role',
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <RoleSelection />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'student-profile',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <LazyRoute>
              <StudentProfileSetup />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'parent-profile',
        element: (
          <ProtectedRoute allowedRoles={['parent']}>
            <LazyRoute>
              <ParentProfileSetup />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscription',
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <SubscriptionSelection />
            </LazyRoute>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <DashboardPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <ParentDashboardPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/test',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <TestBrowserPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/test/:testId',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <TestTakingPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/test/result/:resultId',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <TestResultPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/test/history',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <TestHistoryPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <LazyRoute>
          <AnalyticsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/analytics/progress',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <ProgressPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/analytics/study-time',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <StudyTimePage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/analytics/weak-topics',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <WeakTopicsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/activity-log',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <ActivityLogPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/controls',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <ControlsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parent/settings',
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <LazyRoute>
          <SettingsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pricing',
    element: (
      <LazyRoute>
        <PricingPage />
      </LazyRoute>
    ),
  },
  {
    path: '/subscription/checkout',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <CheckoutPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscription/success',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <SuccessPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/subscription/manage',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <SubscriptionManagementPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

export default router;
