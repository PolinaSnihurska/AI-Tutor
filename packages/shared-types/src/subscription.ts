export type SubscriptionPlan = 'free' | 'premium' | 'family';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

export interface Subscription {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  features: SubscriptionFeatures;
  stripeSubscriptionId?: string;
}

export interface SubscriptionFeatures {
  aiQueriesPerDay: number | 'unlimited';
  testsPerDay: number | 'unlimited';
  analyticsLevel: 'basic' | 'advanced';
  familyMembers: number;
  prioritySupport: boolean;
  materialAccess: number; // percentage
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    aiQueriesPerDay: 5,
    testsPerDay: 3,
    analyticsLevel: 'basic',
    familyMembers: 1,
    prioritySupport: false,
    materialAccess: 60,
  },
  premium: {
    aiQueriesPerDay: 'unlimited',
    testsPerDay: 'unlimited',
    analyticsLevel: 'advanced',
    familyMembers: 1,
    prioritySupport: true,
    materialAccess: 100,
  },
  family: {
    aiQueriesPerDay: 'unlimited',
    testsPerDay: 'unlimited',
    analyticsLevel: 'advanced',
    familyMembers: 3,
    prioritySupport: true,
    materialAccess: 100,
  },
};
