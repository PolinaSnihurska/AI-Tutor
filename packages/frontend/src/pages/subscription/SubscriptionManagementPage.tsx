import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Loading, ErrorAlert, Modal } from '../../components/ui';
import { subscriptionApi } from '../../lib/api';
import { SubscriptionPlan, SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';

const PLAN_NAMES = {
  free: 'Free',
  premium: 'Premium',
  family: 'Family',
};

const PLAN_PRICES = {
  free: '$0',
  premium: '$9.99',
  family: '$19.99',
};

export function SubscriptionManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Fetch current subscription
  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: subscriptionApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowCancelModal(false);
    },
  });

  // Update subscription mutation
  const updateMutation = useMutation({
    mutationFn: (plan: SubscriptionPlan) => subscriptionApi.updateSubscription(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowUpgradeModal(false);
      setSelectedPlan(null);
    },
  });

  // Create portal session mutation
  const portalMutation = useMutation({
    mutationFn: () => {
      const returnUrl = `${window.location.origin}/subscription/manage`;
      return subscriptionApi.createPortalSession(returnUrl);
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const handleCancelSubscription = () => {
    cancelMutation.mutate();
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (plan === 'premium' || plan === 'family') {
      // For paid plans, go through Stripe checkout
      navigate('/subscription/checkout', { state: { plan } });
    } else {
      // For downgrade to free, update directly
      setSelectedPlan(plan);
      setShowUpgradeModal(true);
    }
  };

  const handleConfirmUpgrade = () => {
    if (selectedPlan) {
      updateMutation.mutate(selectedPlan);
    }
  };

  const handleManageBilling = () => {
    portalMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <ErrorAlert message="Failed to load subscription details" />
      </div>
    );
  }

  const currentPlan = subscription.plan;
  const features = SUBSCRIPTION_TIERS[currentPlan];
  const isActive = subscription.status === 'active';
  const isCancelled = subscription.status === 'cancelled';
  const hasStripeSubscription = !!subscription.stripeSubscriptionId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Plan */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {PLAN_NAMES[currentPlan]} Plan
                </h2>
                <p className="text-gray-600">
                  {isActive && !isCancelled && 'Your subscription is active'}
                  {isCancelled && 'Your subscription will be cancelled at the end of the billing period'}
                  {!isActive && !isCancelled && 'Your subscription is not active'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {PLAN_PRICES[currentPlan]}
                </div>
                {currentPlan !== 'free' && <div className="text-sm text-gray-600">/month</div>}
              </div>
            </div>

            {subscription.endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  {isCancelled
                    ? `Your subscription will end on ${new Date(subscription.endDate).toLocaleDateString()}`
                    : `Next billing date: ${new Date(subscription.endDate).toLocaleDateString()}`}
                </p>
              </div>
            )}

            {/* Features */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Your plan includes:</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Explanations</p>
                    <p className="text-sm text-gray-600">
                      {features.aiQueriesPerDay === 'unlimited'
                        ? 'Unlimited'
                        : `${features.aiQueriesPerDay} per day`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tests</p>
                    <p className="text-sm text-gray-600">
                      {features.testsPerDay === 'unlimited'
                        ? 'Unlimited'
                        : `${features.testsPerDay} per day`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Learning Materials</p>
                    <p className="text-sm text-gray-600">{features.materialAccess}% access</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Analytics</p>
                    <p className="text-sm text-gray-600">
                      {features.analyticsLevel === 'advanced' ? 'Advanced' : 'Basic'}
                    </p>
                  </div>
                </div>
                {features.familyMembers > 1 && (
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Family Members</p>
                      <p className="text-sm text-gray-600">Up to {features.familyMembers}</p>
                    </div>
                  </div>
                )}
                {features.prioritySupport && (
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Priority Support</p>
                      <p className="text-sm text-gray-600">24/7 assistance</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {currentPlan === 'free' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleUpgrade('premium')}
                    className="flex-1"
                  >
                    Upgrade to Premium
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpgrade('family')}
                    className="flex-1"
                  >
                    Upgrade to Family
                  </Button>
                </>
              )}
              {currentPlan === 'premium' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleUpgrade('family')}
                    className="flex-1"
                  >
                    Upgrade to Family
                  </Button>
                  {hasStripeSubscription && (
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={portalMutation.isPending}
                      className="flex-1"
                    >
                      {portalMutation.isPending ? 'Loading...' : 'Manage Billing'}
                    </Button>
                  )}
                  {!isCancelled && (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="flex-1"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
              {currentPlan === 'family' && (
                <>
                  {hasStripeSubscription && (
                    <Button
                      variant="primary"
                      onClick={handleManageBilling}
                      disabled={portalMutation.isPending}
                      className="flex-1"
                    >
                      {portalMutation.isPending ? 'Loading...' : 'Manage Billing'}
                    </Button>
                  )}
                  {!isCancelled && (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="flex-1"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Compare Plans */}
        {currentPlan !== 'family' && (
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Compare plans</h3>
              <div className="space-y-4">
                {currentPlan === 'free' && (
                  <>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">Premium</h4>
                          <p className="text-sm text-gray-600">
                            Unlimited access to all features
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">$9.99</div>
                          <div className="text-sm text-gray-600">/month</div>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpgrade('premium')}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">Family</h4>
                          <p className="text-sm text-gray-600">Premium for up to 3 children</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">$19.99</div>
                          <div className="text-sm text-gray-600">/month</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpgrade('family')}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </>
                )}
                {currentPlan === 'premium' && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">Family</h4>
                        <p className="text-sm text-gray-600">
                          Add up to 2 more children with parent monitoring
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">$19.99</div>
                        <div className="text-sm text-gray-600">/month</div>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => handleUpgrade('family')}>
                      Upgrade to Family
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel your subscription? You'll lose access to:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              Unlimited AI explanations and tests
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              Advanced analytics and predictions
            </li>
            <li className="flex items-start text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              Priority support
            </li>
          </ul>
          <p className="text-sm text-gray-600">
            You'll continue to have access until the end of your billing period.
          </p>
          {cancelMutation.isError && (
            <ErrorAlert message="Failed to cancel subscription. Please try again." />
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              className="flex-1"
            >
              Keep Subscription
            </Button>
            <Button
              variant="primary"
              onClick={handleCancelSubscription}
              disabled={cancelMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Confirmation Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setSelectedPlan(null);
        }}
        title="Confirm Plan Change"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to change to the {selectedPlan && PLAN_NAMES[selectedPlan]} plan?
          </p>
          {updateMutation.isError && (
            <ErrorAlert message="Failed to update subscription. Please try again." />
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedPlan(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmUpgrade}
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
