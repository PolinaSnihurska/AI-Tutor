import { apiClient } from './client';
import { Subscription, SubscriptionPlan } from '@ai-tutor/shared-types';

export interface SubscriptionResponse {
  success: boolean;
  data: Subscription & {
    id: string;
  };
  message?: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

export interface PortalSessionResponse {
  success: boolean;
  data: {
    url: string;
  };
}

export const subscriptionApi = {
  getSubscription: async (): Promise<Subscription & { id: string }> => {
    const response = await apiClient.get<SubscriptionResponse>('/api/subscriptions');
    return response.data.data;
  },

  updateSubscription: async (plan: SubscriptionPlan): Promise<Subscription & { id: string }> => {
    const response = await apiClient.put<SubscriptionResponse>('/api/subscriptions', { plan });
    return response.data.data;
  },

  cancelSubscription: async (): Promise<Subscription & { id: string }> => {
    const response = await apiClient.post<SubscriptionResponse>('/api/subscriptions/cancel');
    return response.data.data;
  },

  createCheckoutSession: async (
    plan: 'premium' | 'family',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> => {
    const response = await apiClient.post<CheckoutSessionResponse>(
      '/api/subscriptions/checkout',
      {
        plan,
        successUrl,
        cancelUrl,
      }
    );
    return response.data.data;
  },

  createPortalSession: async (returnUrl: string): Promise<{ url: string }> => {
    const response = await apiClient.post<PortalSessionResponse>(
      '/api/subscriptions/portal',
      {
        returnUrl,
      }
    );
    return response.data.data;
  },
};
