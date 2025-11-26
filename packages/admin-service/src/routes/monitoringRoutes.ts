import { Router } from 'express';
import {
  getServicesHealth,
  getUserActivityStats,
  getRecentUserActivity,
  getSubscriptionAnalytics,
  getSubscriptionTrends,
  getAIUsageAnalytics,
  getAIUsageSummary,
  getDatabaseStats,
  getErrorLogs,
} from '../controllers/monitoringController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// All routes require authentication
router.use(authenticateAdmin);

// Service Health
router.get('/services/health', getServicesHealth);

// User Activity
router.get('/activity/stats', getUserActivityStats);
router.get('/activity/recent', getRecentUserActivity);

// Subscription Analytics
router.get('/subscriptions/analytics', getSubscriptionAnalytics);
router.get('/subscriptions/trends', getSubscriptionTrends);

// AI Usage
router.get('/ai/analytics', getAIUsageAnalytics);
router.get('/ai/summary', getAIUsageSummary);

// System Performance
router.get('/database/stats', getDatabaseStats);
router.get('/errors', getErrorLogs);

export default router;
