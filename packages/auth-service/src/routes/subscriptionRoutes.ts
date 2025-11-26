import { Router } from 'express';
import express from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const subscriptionController = new SubscriptionController();

// Webhook route (no authentication, uses raw body)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => subscriptionController.handleWebhook(req, res)
);

// All other routes require authentication
router.use(authenticate);

// Subscription management routes
router.get('/', (req, res) => subscriptionController.getSubscription(req, res));
router.put('/', (req, res) => subscriptionController.updateSubscription(req, res));
router.post('/cancel', (req, res) => subscriptionController.cancelSubscription(req, res));

// Stripe checkout and portal
router.post('/checkout', (req, res) => subscriptionController.createCheckoutSession(req, res));
router.post('/portal', (req, res) => subscriptionController.createPortalSession(req, res));

export default router;
