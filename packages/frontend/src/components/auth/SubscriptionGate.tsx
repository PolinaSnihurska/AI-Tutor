import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../ui';

interface SubscriptionGateProps {
  children: ReactNode;
  requiredPlan: 'premium' | 'family';
  feature: string;
  currentPlan?: 'free' | 'premium' | 'family';
}

export function SubscriptionGate({
  children,
  requiredPlan,
  feature,
  currentPlan = 'free',
}: SubscriptionGateProps) {
  const hasAccess = () => {
    if (requiredPlan === 'premium') {
      return currentPlan === 'premium' || currentPlan === 'family';
    }
    if (requiredPlan === 'family') {
      return currentPlan === 'family';
    }
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Upgrade to {requiredPlan === 'premium' ? 'Premium' : 'Family Plan'}
        </h3>
        <p className="text-gray-600 mb-6">
          {feature} is available with {requiredPlan === 'premium' ? 'Premium' : 'Family'}{' '}
          subscription. Upgrade now to unlock this feature and more!
        </p>
        <div className="space-y-3">
          <Link to="/upgrade">
            <Button variant="primary" className="w-full">
              Upgrade Now
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" className="w-full">
              View Plans
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

interface FeatureLockedProps {
  feature: string;
  requiredPlan: 'premium' | 'family';
}

export function FeatureLocked({ feature, requiredPlan }: FeatureLockedProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-100 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-2">{feature}</p>
          <p className="text-xs text-gray-600 mb-3">
            Available with {requiredPlan === 'premium' ? 'Premium' : 'Family Plan'}
          </p>
          <Link to="/upgrade">
            <Button variant="primary" size="sm">
              Upgrade
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
