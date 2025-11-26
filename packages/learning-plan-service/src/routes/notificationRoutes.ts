import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { ReminderService } from '../services/reminderService';

const router = Router();
const notificationService = new NotificationService();
const reminderService = new ReminderService();

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = await notificationService.getUserNotifications(
      userId,
      status as any,
      limit
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Get unread notifications for the authenticated user
 * GET /api/notifications/unread
 */
router.get('/unread', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await notificationService.getUnreadNotifications(userId);

    res.json({ 
      notifications,
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const notificationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await notificationService.markAsRead(notificationId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await notificationService.markAllAsRead(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * Get pending notifications (for testing and admin)
 * GET /api/notifications/pending
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const notifications = await notificationService.getPendingNotifications();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching pending notifications:', error);
    res.status(500).json({ error: 'Failed to fetch pending notifications' });
  }
});

/**
 * Update notification status
 * PATCH /api/notifications/:id/status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['pending', 'sent', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const notification = await notificationService.updateNotificationStatus(
      notificationId,
      status
    );

    res.json(notification);
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({ error: 'Failed to update notification status' });
  }
});

/**
 * Manually trigger notification processing (admin only)
 * POST /api/notifications/process
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check
    
    await reminderService.processPendingNotifications();

    res.json({ success: true, message: 'Notifications processed' });
  } catch (error) {
    console.error('Error processing notifications:', error);
    res.status(500).json({ error: 'Failed to process notifications' });
  }
});

export default router;
