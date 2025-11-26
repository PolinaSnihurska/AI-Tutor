import { query } from '../db/connection';
import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '@ai-tutor/shared-types';
import { v4 as uuidv4 } from 'uuid';

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data: Record<string, any> | null;
  status: NotificationStatus;
  scheduled_for: Date;
  sent_at: Date | null;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    title: string,
    message: string,
    scheduledFor: Date,
    data?: Record<string, any>
  ): Promise<Notification> {
    const result = await query(
      `INSERT INTO notifications (
        id, user_id, type, channel, title, message, data, scheduled_for, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        uuidv4(),
        userId,
        type,
        channel,
        title,
        message,
        data ? JSON.stringify(data) : null,
        scheduledFor,
        'pending',
      ]
    );

    return this.rowToNotification(result.rows[0]);
  }

  /**
   * Get pending notifications that are due to be sent
   */
  async getPendingNotifications(limit: number = 100): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE status = 'pending' 
       AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => this.rowToNotification(row));
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    status?: NotificationStatus,
    limit: number = 50
  ): Promise<Notification[]> {
    let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows.map(row => this.rowToNotification(row));
  }

  /**
   * Get unread in-app notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const result = await query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       AND channel = 'in_app' 
       AND status = 'sent'
       AND read_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.rowToNotification(row));
  }

  /**
   * Mark a notification as sent
   */
  async markAsSent(notificationId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  }

  /**
   * Mark a notification as failed
   */
  async markAsFailed(notificationId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = 'failed', updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = 'read', read_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus
  ): Promise<Notification> {
    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const params: any[] = [status, notificationId];

    if (status === 'sent') {
      updates.push('sent_at = NOW()');
    }

    const result = await query(
      `UPDATE notifications 
       SET ${updates.join(', ')}
       WHERE id = $2
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error('Notification not found');
    }

    return this.rowToNotification(result.rows[0]);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await query(
      `UPDATE notifications 
       SET status = 'read', read_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND status = 'sent' AND read_at IS NULL`,
      [userId]
    );
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const result = await query(
      `DELETE FROM notifications 
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'
       AND status IN ('sent', 'read', 'failed')
       RETURNING id`,
      []
    );

    return result.rowCount || 0;
  }

  /**
   * Send email notification (placeholder - integrate with email service)
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${body}`);
    
    // For now, just log and return success
    // In production, this would call an actual email service
    return true;
  }

  /**
   * Process and send a notification
   */
  async processNotification(notification: Notification, userEmail: string): Promise<boolean> {
    try {
      if (notification.channel === 'email') {
        const success = await this.sendEmail(
          userEmail,
          notification.title,
          notification.message
        );
        
        if (success) {
          await this.markAsSent(notification.id);
          return true;
        } else {
          await this.markAsFailed(notification.id);
          return false;
        }
      } else if (notification.channel === 'in_app') {
        // In-app notifications are just marked as sent
        // They will be retrieved by the frontend
        await this.markAsSent(notification.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      await this.markAsFailed(notification.id);
      return false;
    }
  }

  private rowToNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      channel: row.channel,
      title: row.title,
      message: row.message,
      data: row.data || undefined,
      status: row.status,
      scheduledFor: row.scheduled_for,
      sentAt: row.sent_at || undefined,
      readAt: row.read_at || undefined,
      createdAt: row.created_at,
    };
  }
}
