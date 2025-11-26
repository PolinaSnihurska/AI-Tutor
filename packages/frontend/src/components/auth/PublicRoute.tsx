import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectTo?: string;
}

export function PublicRoute({
  children,
  redirectIfAuthenticated = true,
  redirectTo = '/dashboard',
}: PublicRouteProps) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.user);

  // If user is authenticated and we should redirect, determine where to send them
  if (redirectIfAuthenticated && isAuthenticated && profile) {
    // Redirect parents to parent dashboard, students to regular dashboard
    const destination = profile.role === 'parent' ? '/parent/dashboard' : redirectTo;
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}
