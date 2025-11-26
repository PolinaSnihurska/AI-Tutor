import { Request, Response } from 'express';
import { Subscription, User } from '../models';
import { SUBSCRIPTION_TIERS } from '@ai-tutor/shared-types';
import { z } from 'zod';
import { StripeService } from '../services/stripeService';

const UpdateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'premium', 'family']),
});

export class SubscriptionController {
  async getSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      let subscription = await Subscription.findByUserId(userId);
      
      // Create default free subscription if none exists
      if (!subscription) {
        subscription = await Subscription.create({
          userId,
          plan: 'free',
          status: 'active',
        });
      }
      
      const features = SUBSCRIPTION_TIERS[subscription.plan];
      
      res.status(200).json({
        success: true,
        data: {
          id: subscription.id,
          userId: subscription.user_id,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          features,
          stripeSubscriptionId: subscription.stripe_subscription_id,
        },
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription',
      });
    }
  }

  async updateSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const validated = UpdateSubscriptionSchema.parse(req.body);
      
      const currentSubscription = await Subscription.findByUserId(userId);
      
      if (!currentSubscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }
      
      // Validate upgrade/downgrade logic
      const currentPlan = currentSubscription.plan;
      const newPlan = validated.plan;
      
      // Prevent downgrade if it would violate constraints (e.g., too many children)
      if (newPlan === 'free' || (newPlan === 'premium' && currentPlan === 'family')) {
        // Check if user has children linked that would exceed new plan limits
        const { query } = await import('../db/connection');
        const childCount = await query(
          'SELECT COUNT(*) as count FROM parent_child_links WHERE parent_id = $1',
          [userId]
        );
        
        const count = parseInt(childCount.rows[0].count);
        const maxChildren = SUBSCRIPTION_TIERS[newPlan].familyMembers;
        
        if (count > maxChildren) {
          return res.status(400).json({
            success: false,
            error: `Cannot downgrade: You have ${count} children linked, but ${newPlan} plan allows only ${maxChildren}`,
          });
        }
      }
      
      // Calculate end date for paid plans (30 days from now)
      const endDate = (newPlan === 'premium' || newPlan === 'family') 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null;
      
      const subscription = await Subscription.update(userId, {
        plan: newPlan,
        status: 'active',
        endDate,
      });
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }
      
      const features = SUBSCRIPTION_TIERS[subscription.plan];
      
      res.status(200).json({
        success: true,
        data: {
          id: subscription.id,
          userId: subscription.user_id,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          features,
        },
        message: 'Subscription updated successfully',
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription',
      });
    }
  }

  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const subscription = await Subscription.findByUserId(userId);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }
      
      if (subscription.plan === 'free') {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel free subscription',
        });
      }
      
      // Cancel via Stripe if there's a Stripe subscription
      if (subscription.stripe_subscription_id) {
        await StripeService.cancelSubscription(userId);
      } else {
        // Manual cancellation
        await Subscription.update(userId, {
          status: 'cancelled',
        });
      }
      
      const updated = await Subscription.findByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: {
          id: updated!.id,
          userId: updated!.user_id,
          plan: updated!.plan,
          status: updated!.status,
          endDate: updated!.end_date,
        },
        message: 'Subscription cancelled. Access will continue until end date.',
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  }

  async createCheckoutSession(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const CheckoutSchema = z.object({
        plan: z.enum(['premium', 'family']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      });
      
      const validated = CheckoutSchema.parse(req.body);
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const session = await StripeService.createCheckoutSession(
        userId,
        user.email,
        validated.plan,
        validated.successUrl,
        validated.cancelUrl
      );
      
      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Create checkout session error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  }

  async createPortalSession(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
      
      const PortalSchema = z.object({
        returnUrl: z.string().url(),
      });
      
      const validated = PortalSchema.parse(req.body);
      
      const url = await StripeService.createPortalSession(userId, validated.returnUrl);
      
      res.status(200).json({
        success: true,
        data: { url },
      });
    } catch (error) {
      console.error('Create portal session error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing stripe-signature header',
        });
      }
      
      // req.body should be raw buffer for webhook verification
      const payload = req.body;
      
      await StripeService.handleWebhook(payload, signature);
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      });
    }
  }
}
