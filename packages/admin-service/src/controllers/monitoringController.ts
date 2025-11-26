import { Response } from 'express';
import { AdminRequest } from '../middleware/adminAuth';
import { Monitoring } from '../models/Monitoring';

export const getServicesHealth = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const services = await Monitoring.getAllServicesHealth();
    res.json({ services });
  } catch (error) {
    console.error('Get services health error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserActivityStats = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await Monitoring.getUserActivityStats(days);
    res.json({ stats });
  } catch (error) {
    console.error('Get user activity stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecentUserActivity = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const activity = await Monitoring.getRecentUserActivity(limit);
    res.json({ activity });
  } catch (error) {
    console.error('Get recent user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubscriptionAnalytics = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const analytics = await Monitoring.getSubscriptionAnalytics();
    res.json({ analytics });
  } catch (error) {
    console.error('Get subscription analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubscriptionTrends = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = await Monitoring.getSubscriptionTrends(days);
    res.json({ trends });
  } catch (error) {
    console.error('Get subscription trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAIUsageAnalytics = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const analytics = await Monitoring.getAIUsageAnalytics(days);
    res.json({ analytics });
  } catch (error) {
    console.error('Get AI usage analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAIUsageSummary = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const summary = await Monitoring.getAIUsageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Get AI usage summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDatabaseStats = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const stats = await Monitoring.getDatabaseStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getErrorLogs = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await Monitoring.getErrorLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Get error logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
