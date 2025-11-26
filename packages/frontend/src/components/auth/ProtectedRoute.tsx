import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { Loading } from '../ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<'student' | 'parent' | 'admin'>;
  requireSubscription?: Array<'free' | 'premium' | 'family'>;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
  requireSubscription,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);
  const { profile, isLoading: profileLoading } = useAppSelector((state) => state.user);

  // Show loading while checking authentication
  if (authLoading || profileLoading) {
    return <Loading fullScreen size="lg" text="Loading..." />;
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to login if user is authenticated but profile is not loaded
  if (requireAuth && isAuthenticated && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = profile.role === 'parent' ? '/parent/dashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Check subscription-based access
  if (requireSubscription && profile) {
    // TODO: Implement subscription check when subscription data is available
    // For now, we'll allow access
    // const userSubscription = useAppSelector((state) => state.subscription);
    // if (!requireSubscription.includes(userSubscription.plan)) {
    //   return <Navigate to="/upgrade" replace />;
    // }
  }

  return <>{children}</>;
}
