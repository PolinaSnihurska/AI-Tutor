import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi, LoginRequest, RegisterRequest, userApi } from '../lib/api';
import { useAppDispatch } from '../store';
import { clearTokens, setTokens } from '../store/slices/authSlice';
import { clearProfile, setProfile } from '../store/slices/userSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      dispatch(
        setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        })
      );
      dispatch(setProfile(response.user));
      // Navigate based on user role
      const destination = response.user.role === 'parent' ? '/parent/dashboard' : '/dashboard';
      navigate(destination);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response) => {
      dispatch(
        setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        })
      );
      dispatch(setProfile(response.user));
      // Navigate to onboarding based on role
      const destination = response.user.role === 'parent' 
        ? '/onboarding/parent-profile' 
        : '/onboarding/student-profile';
      navigate(destination);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      dispatch(clearTokens());
      dispatch(clearProfile());
      navigate('/login');
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
