import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, ErrorAlert } from '../../components/ui';
import { OnboardingLayout } from './OnboardingLayout';
import { userApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';

export function ParentProfileSetup() {
  const navigate = useNavigate();
  const [childEmail, setChildEmail] = useState('');
  const [error, setError] = useState('');
  const [linkedChildren, setLinkedChildren] = useState<string[]>([]);

  const linkMutation = useMutation({
    mutationFn: (email: string) => userApi.linkChild(email),
    onSuccess: () => {
      setLinkedChildren((prev) => [...prev, childEmail]);
      setChildEmail('');
      setError('');
    },
    onError: (err) => {
      setError(handleApiError(err));
    },
  });

  const validateEmail = () => {
    if (!childEmail) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(childEmail)) {
      setError('Please enter a valid email');
      return false;
    }
    if (linkedChildren.includes(childEmail)) {
      setError('This child is already linked');
      return false;
    }
    setError('');
    return true;
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    linkMutation.mutate(childEmail);
  };

  const handleContinue = () => {
    navigate('/onboarding/subscription');
  };

  const handleSkip = () => {
    navigate('/onboarding/subscription');
  };

  return (
    <OnboardingLayout
      currentStep={0}
      totalSteps={2}
      title="Link your children's accounts"
      subtitle="Connect with your children to monitor their learning progress"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Enter your child's email address to send them a link request. They'll need to
            accept the request before you can view their progress.
          </p>
        </div>

        <form onSubmit={handleAddChild} className="space-y-4">
          {error && <ErrorAlert message={error} />}

          <div className="flex gap-2">
            <Input
              label="Child's Email Address"
              type="email"
              name="childEmail"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              placeholder="child@example.com"
              className="flex-1"
            />
            <div className="flex items-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={linkMutation.isPending}
              >
                Add Child
              </Button>
            </div>
          </div>
        </form>

        {linkedChildren.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Linked Children ({linkedChildren.length})
            </h3>
            <div className="space-y-2">
              {linkedChildren.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-600 mr-2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700">{email}</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    Request sent
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleContinue}
            className="flex-1"
            disabled={linkedChildren.length === 0}
          >
            Continue
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can add more children later from your account settings
        </p>
      </div>
    </OnboardingLayout>
  );
}
