import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { OnboardingLayout } from './OnboardingLayout';
import { useAppSelector } from '../../store';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: 'free' | 'premium' | 'family';
  name: string;
  price: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out the platform',
    features: [
      { text: '5 AI explanations per day', included: true },
      { text: '3 tests per day', included: true },
      { text: '60% of learning materials', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Unlimited explanations', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    description: 'Full access for serious learners',
    popular: true,
    features: [
      { text: 'Unlimited AI explanations', included: true },
      { text: 'Unlimited tests', included: true },
      { text: '100% of learning materials', included: true },
      { text: 'Advanced analytics & predictions', included: true },
      { text: 'Personalized learning plans', included: true },
      { text: 'Priority support', included: true },
      { text: 'Ad-free experience', included: true },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: '$19.99',
    description: 'Premium for up to 3 children',
    features: [
      { text: 'All Premium features', included: true },
      { text: 'Up to 3 children', included: true },
      { text: 'Parent monitoring dashboard', included: true },
      { text: 'Parental controls', included: true },
      { text: 'Family progress reports', included: true },
      { text: 'Priority support', included: true },
      { text: 'Best value for families', included: true },
    ],
  },
];

export function SubscriptionSelection() {
  const navigate = useNavigate();
  const userProfile = useAppSelector((state) => state.user.profile);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'family'>('free');

  const handleContinue = () => {
    if (selectedPlan === 'free') {
      // For free plan, just go to dashboard
      navigate('/dashboard');
    } else {
      // For paid plans, go to payment page
      navigate('/onboarding/payment', { state: { plan: selectedPlan } });
    }
  };

  const handleStartFree = () => {
    setSelectedPlan('free');
    navigate('/dashboard');
  };

  // Filter plans based on user role
  const availablePlans = userProfile?.role === 'parent' 
    ? PLANS 
    : PLANS.filter(p => p.id !== 'family');

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={2}
      title="Choose your plan"
      subtitle="Start with a free plan or unlock full access with Premium"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {availablePlans.map((plan) => (
            <div
              key={plan.id}
              className={`
                relative border-2 rounded-lg p-6 cursor-pointer transition-all
                ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {plan.price}
                  {plan.id !== 'free' && <span className="text-lg text-gray-600">/mo</span>}
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    {feature.included ? (
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-center">
                <input
                  type="radio"
                  name="plan"
                  checked={selectedPlan === plan.id}
                  onChange={() => setSelectedPlan(plan.id)}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleStartFree}
            className="flex-1"
          >
            Start with Free
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleContinue}
            className="flex-1"
          >
            {selectedPlan === 'free' ? 'Get Started' : 'Continue to Payment'}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can upgrade or cancel anytime from your account settings
        </p>
      </div>
    </OnboardingLayout>
  );
}
