import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Loading } from '../../components/ui';
import { authApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      // Wait a moment before redirecting to show success message
      setTimeout(() => {
        navigate('/login', { state: { message: 'Email verified! Please sign in.' } });
      }, 2000);
    },
    onError: (err) => {
      setError(handleApiError(err));
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setError('Invalid verification link');
    }
  }, [token]);

  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <div className="text-center py-8">
              <Loading size="lg" text="Verifying your email..." />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Verification
            </h1>
          </div>

          <Card>
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 inline-flex mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Go to Sign in
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Verified!
          </h1>
        </div>

        <Card>
          <div className="text-center">
            <div className="rounded-full bg-green-100 p-3 inline-flex mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Success!
            </h3>
            <p className="text-gray-600 mb-6">
              Your email has been verified. Redirecting to sign in...
            </p>
            <Link to="/login">
              <Button variant="primary" className="w-full">
                Continue to Sign in
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
