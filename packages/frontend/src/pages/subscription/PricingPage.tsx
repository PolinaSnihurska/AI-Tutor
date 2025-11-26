import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { SUBSCRIPTION_TIERS, SubscriptionPlan } from '@ai-tutor/shared-types';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: SubscriptionPlan;
  name: string;
  price: string;
  priceMonthly: number;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceMonthly: 0,
    description: 'Perfect for trying out the platform',
    cta: 'Get Started',
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
    priceMonthly: 9.99,
    description: 'Full access for serious learners',
    popular: true,
    cta: 'Start Premium',
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
    priceMonthly: 19.99,
    description: 'Premium for up to 3 children',
    cta: 'Start Family Plan',
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

const FAQ_ITEMS = [
  {
    question: 'Can I change my plan later?',
    answer:
      'Yes! You can upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through our secure payment processor, Stripe.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Absolutely. You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'The Free plan is available indefinitely with no credit card required. You can upgrade to Premium or Family at any time to unlock all features.',
  },
  {
    question: 'How does the Family plan work?',
    answer:
      'The Family plan allows one parent account to monitor up to 3 children. Each child gets full Premium access, and parents get a comprehensive monitoring dashboard.',
  },
  {
    question: 'What happens if I exceed the daily limits on the Free plan?',
    answer:
      'You\'ll be prompted to upgrade to Premium for unlimited access. Your progress is saved, and you can continue the next day or upgrade immediately.',
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    if (planId === 'free') {
      navigate('/register');
    } else {
      navigate('/subscription/checkout', { state: { plan: planId } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">AI Tutoring Platform</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="primary" onClick={() => navigate('/register')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose the perfect plan for your learning journey
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start free, upgrade when you need more. No credit card required.
          </p>

          {/* Billing Period Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setBillingPeriod('annual')}
            >
              Annual
              <span className="ml-1 text-xs text-green-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          {PLANS.map((plan) => {
            const displayPrice =
              billingPeriod === 'annual' && plan.priceMonthly > 0
                ? `$${(plan.priceMonthly * 0.8 * 12).toFixed(2)}`
                : plan.price;
            const priceLabel =
              billingPeriod === 'annual' && plan.priceMonthly > 0 ? '/year' : '/month';

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-2 border-blue-500 shadow-lg' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-gray-900">{displayPrice}</span>
                      {plan.id !== 'free' && (
                        <span className="text-gray-600 ml-1">{priceLabel}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        {feature.included ? (
                          <svg
                            className="h-5 w-5 text-green-500 mr-3 flex-shrink-0"
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
                            className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0"
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
                        <span
                          className={feature.included ? 'text-gray-700' : 'text-gray-400'}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Compare all features
          </h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Free
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Family
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">AI Explanations</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.free.aiQueriesPerDay}/day
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.premium.aiQueriesPerDay}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.family.aiQueriesPerDay}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Tests per day</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.free.testsPerDay}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.premium.testsPerDay}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.family.testsPerDay}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Learning Materials</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.free.materialAccess}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.premium.materialAccess}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">
                    {SUBSCRIPTION_TIERS.family.materialAccess}%
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Analytics</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Basic</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Advanced</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Advanced</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Family Members</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">3</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Parent Dashboard</td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-gray-300 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-gray-300 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-green-500 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">Priority Support</td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-gray-300 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-green-500 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg
                      className="h-5 w-5 text-green-500 mx-auto"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <Card key={index} className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{item.question}</h4>
                <p className="text-gray-600">{item.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-blue-600 rounded-lg p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to start your learning journey?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of students achieving their academic goals
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/register')}
            >
              Start Free
            </Button>
            <Button
              variant="primary"
              className="bg-blue-800 hover:bg-blue-900"
              onClick={() => handleSelectPlan('premium')}
            >
              Go Premium
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 AI Tutoring Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
