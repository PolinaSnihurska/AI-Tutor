import { Router, Request, Response } from 'express';
import { ProgressCalculationService } from '../services/progressCalculationService';
import { HeatmapService } from '../services/heatmapService';
import { PredictionService } from '../services/predictionService';
import { EventTrackingService } from '../services/eventTrackingService';
import { SnapshotService } from '../services/snapshotService';

const router = Router();

/**
 * GET /api/analytics/progress/:studentId
 * Get student progress for a date range
 */
router.get('/progress/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const progress = await ProgressCalculationService.calculateProgress(
      studentId,
      {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      }
    );

    res.json(progress);
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

/**
 * GET /api/analytics/trends/:studentId
 * Get performance trends over time
 */
router.get('/trends/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const trends = await ProgressCalculationService.getPerformanceTrends(
      studentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(trends);
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

/**
 * GET /api/analytics/heatmap/:studentId
 * Get heatmap for a student
 */
router.get('/heatmap/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.query;

    if (subject) {
      const heatmap = await HeatmapService.generateSubjectHeatmap(studentId, subject as string);
      res.json({ studentId, subjects: [heatmap], generatedAt: new Date() });
    } else {
      const heatmap = await HeatmapService.generateHeatmap(studentId);
      res.json(heatmap);
    }
  } catch (error) {
    console.error('Error getting heatmap:', error);
    res.status(500).json({ error: 'Failed to get heatmap' });
  }
});

/**
 * GET /api/analytics/weak-topics/:studentId
 * Get weak topics for a student
 */
router.get('/weak-topics/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { threshold } = req.query;

    const weakTopics = await HeatmapService.getWeakTopics(
      studentId,
      threshold ? parseInt(threshold as string) : 50
    );

    res.json({ studentId, weakTopics });
  } catch (error) {
    console.error('Error getting weak topics:', error);
    res.status(500).json({ error: 'Failed to get weak topics' });
  }
});

/**
 * GET /api/analytics/strong-topics/:studentId
 * Get strong topics for a student
 */
router.get('/strong-topics/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { threshold } = req.query;

    const strongTopics = await HeatmapService.getStrongTopics(
      studentId,
      threshold ? parseInt(threshold as string) : 20
    );

    res.json({ studentId, strongTopics });
  } catch (error) {
    console.error('Error getting strong topics:', error);
    res.status(500).json({ error: 'Failed to get strong topics' });
  }
});

/**
 * GET /api/analytics/improving-topics/:studentId
 * Get improving topics for a student
 */
router.get('/improving-topics/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const improvingTopics = await HeatmapService.getImprovingTopics(studentId);
    res.json({ studentId, improvingTopics });
  } catch (error) {
    console.error('Error getting improving topics:', error);
    res.status(500).json({ error: 'Failed to get improving topics' });
  }
});

/**
 * GET /api/analytics/declining-topics/:studentId
 * Get declining topics for a student
 */
router.get('/declining-topics/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const decliningTopics = await HeatmapService.getDecliningTopics(studentId);
    res.json({ studentId, decliningTopics });
  } catch (error) {
    console.error('Error getting declining topics:', error);
    res.status(500).json({ error: 'Failed to get declining topics' });
  }
});

/**
 * GET /api/analytics/prediction/:studentId
 * Get success prediction for a student
 */
router.get('/prediction/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { examType } = req.query;

    if (!examType) {
      return res.status(400).json({ error: 'examType is required' });
    }

    const prediction = await PredictionService.generatePrediction(studentId, examType as string);
    res.json(prediction);
  } catch (error) {
    console.error('Error getting prediction:', error);
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

/**
 * POST /api/analytics/track-event
 * Track a student activity event
 */
router.post('/track-event', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    if (!eventData.studentId || !eventData.activityType) {
      return res.status(400).json({ error: 'studentId and activityType are required' });
    }

    await EventTrackingService.trackEvent(eventData);
    res.json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * GET /api/analytics/realtime/:studentId
 * Get real-time metrics for a student
 */
router.get('/realtime/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const metrics = await EventTrackingService.getRealtimeMetrics(studentId);
    res.json(metrics || { message: 'No real-time data available' });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({ error: 'Failed to get real-time metrics' });
  }
});

/**
 * POST /api/analytics/generate-snapshot/:studentId
 * Manually trigger snapshot generation for a student
 */
router.post('/generate-snapshot/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { date } = req.body;

    await SnapshotService.generateDailySnapshot(
      studentId,
      date ? new Date(date) : new Date()
    );

    res.json({ success: true, message: 'Snapshot generated successfully' });
  } catch (error) {
    console.error('Error generating snapshot:', error);
    res.status(500).json({ error: 'Failed to generate snapshot' });
  }
});

export default router;
