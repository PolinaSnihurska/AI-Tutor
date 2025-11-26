import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Loading, ErrorAlert } from '../../components/ui';
import { subscriptionApi } from '../../lib/api';
import { SubscriptionPlan } from '@ai-tutor/shared-types';

interface LocationState {
  plan: SubscriptionPlan;
}

const PLAN_DETAILS = {
  premium: {
    name: 'Premium',
    price: '$9.99',
    priceAmount: 9.99,
    description: 'Full access for serious learners',
    features: [
      'Unlimited AI explanations',
      'Unlimited tests',
      '100% of learning materials',
      'Advanced analytics & predictions',
      'Personalized learning plans',
      'Priority support',
    ],
  },
  family: {
    name: 'Family',
    price: '$19.99',
    priceAmount: 19.99,
    description: 'Premium for up to 3 children',
    features: [
      'All Premium features',
      'Up to 3 children',
      'Parent monitoring dashboard',
      'Parental controls',
      'Family progress reports',
      'Priority support',
    ],
  },
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [plan, setPlan] = useState<'premium' | 'family'>(
    (state?.plan as 'premium' | 'family') || 'premium'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const planDetails = PLAN_DETAILS[plan];

  const createCheckoutMutation = useMutation({
    mutationFn: () => {
      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/subscription/checkout`;
      return subscriptionApi.createCheckoutSession(plan, successUrl, cancelUrl);
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      setIsProcessing(false);
      console.error('Checkout error:', error);
    },
  });

  const handleCheckout = () => {
    setIsProcessing(true);
    createCheckoutMutation.mutate();
  };

  const handleChangePlan = (newPlan: 'premium' | 'family') => {
    setPlan(newPlan);
  };

  if (!state?.plan && !plan) {
    navigate('/pricing');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">AI Tutoring Platform</h1>
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              Back to Pricing
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete your subscription</h2>
          <p className="text-gray-600">
            You're one step away from unlocking full access to the platform
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Plan Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select your plan</h3>
            <div className="space-y-4">
              {/* Premium Plan */}
              <div
                className={`cursor-pointer transition-all bg-white rounded-lg shadow-md border ${
                  plan === 'premium'
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleChangePlan('premium')}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {PLAN_DETAILS.premium.name}
                      </h4>
                      <p className="text-sm text-gray-600">{PLAN_DETAILS.premium.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {PLAN_DETAILS.premium.price}
                      </div>
                      <div className="text-sm text-gray-600">/month</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="plan"
                      checked={plan === 'premium'}
                      onChange={() => handleChangePlan('premium')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Select this plan</span>
                  </div>
                </div>
              </div>

              {/* Family Plan */}
              <div
                className={`cursor-pointer transition-all bg-white rounded-lg shadow-md border ${
                  plan === 'family'
                    ? 'border-2 border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleChangePlan('family')}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {PLAN_DETAILS.family.name}
                      </h4>
                      <p className="text-sm text-gray-600">{PLAN_DETAILS.family.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {PLAN_DETAILS.family.price}
                      </div>
                      <div className="text-sm text-gray-600">/month</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="plan"
                      checked={plan === 'family'}
                      onChange={() => handleChangePlan('family')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Select this plan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order summary</h3>
            <Card>
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{planDetails.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{planDetails.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {planDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
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
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{planDetails.price}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{planDetails.price}/month</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={isProcessing || createCheckoutMutation.isPending}
                >
                  {isProcessing || createCheckoutMutation.isPending ? (
                    <div className="flex items-center justify-center">
                      <Loading size="sm" />
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>

                {createCheckoutMutation.isError && (
                  <div className="mt-4">
                    <ErrorAlert message="Failed to create checkout session. Please try again." />
                  </div>
                )}

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    Secure payment powered by Stripe
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cancel anytime from your account settings
                  </p>
                </div>
              </div>
            </Card>

            {/* Security Badges */}
            <div className="mt-6 flex items-center justify-center gap-4 text-gray-500">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 mr-1"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Secure Checkout</span>
              </div>
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 mr-1"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs">Money-back Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
