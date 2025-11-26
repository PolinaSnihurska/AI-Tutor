import { Router, Request, Response } from 'express';
import { ParentAnalyticsService } from '../services/parentAnalyticsService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const DateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

/**
 * GET /api/parent/children/:childId/analytics
 * Get comprehensive analytics for a child
 */
router.get('/children/:childId/analytics', async (req: Request, res: Response) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(childId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid child ID format' 
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'startDate and endDate are required' 
      });
    }

    // Validate date range
    const validated = DateRangeSchema.parse({ startDate, endDate });

    const analytics = await ParentAnalyticsService.getChildAnalytics(
      childId,
      {
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate)
      }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting child analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: error.errors
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to get child analytics' 
    });
  }
});

/**
 * GET /api/parent/children/aggregated
 * Get aggregated analytics for multiple children
 */
router.get('/children/aggregated', async (req: Request, res: Response) => {
  try {
    const { childIds, startDate, endDate } = req.query;

    if (!childIds || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'childIds, startDate, and endDate are required' 
      });
    }

    // Parse childIds (comma-separated)
    const childIdArray = (childIds as string).split(',').map(id => id.trim());

    // Validate all child IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of childIdArray) {
      if (!uuidRegex.test(id)) {
        return res.status(400).json({ 
          success: false,
          error: `Invalid child ID format: ${id}` 
        });
      }
    }

    // Validate date range
    const validated = DateRangeSchema.parse({ startDate, endDate });

    const aggregated = await ParentAnalyticsService.getAggregatedAnalytics(
      childIdArray,
      {
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate)
      }
    );

    res.json({
      success: true,
      data: aggregated
    });
  } catch (error) {
    console.error('Error getting aggregated analytics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: error.errors
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to get aggregated analytics' 
    });
  }
});

export default router;
