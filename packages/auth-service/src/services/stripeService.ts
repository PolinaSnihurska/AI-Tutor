// Stripe service for payment processing
// Note: Requires 'stripe' package to be installed: npm install stripe

import { Subscription } from '../models';
import { SubscriptionPlan } from '@ai-tutor/shared-types';

// Stripe will be initialized when the package is installed
let stripe: any = null;

try {
  // Dynamic import to avoid errors if stripe is not installed yet
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
  });
} catch (error) {
  console.warn('Stripe not installed. Payment features will be disabled.');
}

// Price IDs for each plan (these should be set in environment variables)
const STRIPE_PRICES = {
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
  family: process.env.STRIPE_FAMILY_PRICE_ID || 'price_family',
};

export class StripeService {
  /**
   * Create a Stripe customer for a user
   */
  static async createCustomer(userId: string, email: string, name: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(
    userId: string,
    email: string,
    plan: SubscriptionPlan,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    if (plan === 'free') {
      throw new Error('Cannot create checkout session for free plan');
    }

    // Get or create customer
    let customerId: string;
    const subscription = await Subscription.findByUserId(userId);
    
    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      customerId = await this.createCustomer(userId, email, email);
      
      // Update subscription with customer ID
      if (subscription) {
        await Subscription.update(userId, {
          stripeCustomerId: customerId,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICES[plan],
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create a portal session for managing subscription
   */
  static async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const subscription = await Subscription.findByUserId(userId);
    
    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Handle webhook events from Stripe
   */
  static async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private static async handleCheckoutCompleted(session: any): Promise<void> {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan as SubscriptionPlan;
    const stripeSubscriptionId = session.subscription;
    const customerId = session.customer;

    // Update subscription in database
    await Subscription.update(userId, {
      plan,
      status: 'active',
      stripeSubscriptionId,
      stripeCustomerId: customerId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    console.log(`Subscription activated for user ${userId}: ${plan}`);
  }

  /**
   * Handle subscription update
   */
  private static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    const stripeSubscriptionId = subscription.id;
    const status = subscription.status;

    const dbSubscription = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
    
    if (!dbSubscription) {
      console.warn(`Subscription not found: ${stripeSubscriptionId}`);
      return;
    }

    // Map Stripe status to our status
    let newStatus: 'active' | 'cancelled' | 'expired' = 'active';
    if (status === 'canceled' || status === 'incomplete_expired') {
      newStatus = 'cancelled';
    } else if (status === 'past_due' || status === 'unpaid') {
      newStatus = 'expired';
    }

    await Subscription.update(dbSubscription.user_id, {
      status: newStatus,
      endDate: new Date(subscription.current_period_end * 1000),
    });

    console.log(`Subscription updated: ${stripeSubscriptionId} -> ${newStatus}`);
  }

  /**
   * Handle subscription deletion/cancellation
   */
  private static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    const stripeSubscriptionId = subscription.id;

    const dbSubscription = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
    
    if (!dbSubscription) {
      console.warn(`Subscription not found: ${stripeSubscriptionId}`);
      return;
    }

    // Downgrade to free plan
    await Subscription.update(dbSubscription.user_id, {
      plan: 'free',
      status: 'active',
      endDate: null,
      stripeSubscriptionId: null,
    });

    console.log(`Subscription cancelled, downgraded to free: ${dbSubscription.user_id}`);
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(invoice: any): Promise<void> {
    const stripeSubscriptionId = invoice.subscription;
    
    if (!stripeSubscriptionId) {
      return;
    }

    const dbSubscription = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
    
    if (!dbSubscription) {
      return;
    }

    // Extend subscription period
    const periodEnd = new Date(invoice.period_end * 1000);
    
    await Subscription.update(dbSubscription.user_id, {
      status: 'active',
      endDate: periodEnd,
    });

    console.log(`Payment succeeded for subscription: ${stripeSubscriptionId}`);
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(invoice: any): Promise<void> {
    const stripeSubscriptionId = invoice.subscription;
    
    if (!stripeSubscriptionId) {
      return;
    }

    const dbSubscription = await Subscription.findByStripeSubscriptionId(stripeSubscriptionId);
    
    if (!dbSubscription) {
      return;
    }

    // Mark as expired
    await Subscription.update(dbSubscription.user_id, {
      status: 'expired',
    });

    console.log(`Payment failed for subscription: ${stripeSubscriptionId}`);
    // TODO: Send notification to user
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(userId: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const subscription = await Subscription.findByUserId(userId);
    
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active Stripe subscription found');
    }

    // Cancel at period end (user keeps access until then)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await Subscription.update(userId, {
      status: 'cancelled',
    });
  }
}
