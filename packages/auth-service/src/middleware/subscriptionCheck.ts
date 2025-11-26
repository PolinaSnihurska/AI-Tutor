import { Request, Response, NextFunction } from 'express';
import { Subscription } from '../models';
import { SUBSCRIPTION_TIERS, SubscriptionPlan } from '@ai-tutor/shared-types';

// Extend Express Request type to include subscription info
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        plan: SubscriptionPlan;
        features: typeof SUBSCRIPTION_TIERS[SubscriptionPlan];
      };
    }
  }
}

/**
 * Middleware to check subscription tier and attach features to request
 */
export async function checkSubscription(req: Request, res: Response, next: NextFunction) {
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
    
    // Check if subscription is expired
    if (subscription.status === 'expired' || 
        (subscription.end_date && new Date(subscription.end_date) < new Date())) {
      // Downgrade to free if expired
      if (subscription.plan !== 'free') {
        const updated = await Subscription.update(userId, {
          plan: 'free',
          status: 'active',
          endDate: null,
        });
        subscription = updated || subscription;
      }
    }
    
    // Attach subscription info to request
    req.subscription = {
      plan: subscription.plan,
      features: SUBSCRIPTION_TIERS[subscription.plan],
    };
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check subscription',
    });
  }
}

/**
 * Middleware to require a minimum subscription tier
 */
export function requireSubscription(minPlan: SubscriptionPlan) {
  const planHierarchy: Record<SubscriptionPlan, number> = {
    free: 0,
    premium: 1,
    family: 2,
  };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      return res.status(500).json({
        success: false,
        error: 'Subscription not checked',
      });
    }
    
    const userPlanLevel = planHierarchy[req.subscription.plan];
    const requiredPlanLevel = planHierarchy[minPlan];
    
    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        success: false,
        error: `This feature requires ${minPlan} subscription`,
        currentPlan: req.subscription.plan,
        requiredPlan: minPlan,
        upgradeRequired: true,
      });
    }
    
    next();
  };
}

/**
 * Middleware to check feature access based on subscription
 */
export function checkFeatureAccess(feature: keyof typeof SUBSCRIPTION_TIERS['free']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.subscription) {
      return res.status(500).json({
        success: false,
        error: 'Subscription not checked',
      });
    }
    
    const featureValue = req.subscription.features[feature];
    
    // If feature is false or 0, deny access
    if (featureValue === false || featureValue === 0) {
      return res.status(403).json({
        success: false,
        error: `This feature is not available in your ${req.subscription.plan} plan`,
        currentPlan: req.subscription.plan,
        upgradeRequired: true,
      });
    }
    
    next();
  };
}
