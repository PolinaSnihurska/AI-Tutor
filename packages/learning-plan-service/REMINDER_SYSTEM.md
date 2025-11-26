# Reminder System Implementation

## Overview

The reminder system provides intelligent task reminders and notifications for the AI Tutoring Platform. It includes:

- **Task Reminders**: Automatic reminders for upcoming tasks based on due dates
- **Intelligent Scheduling**: Reminders scheduled based on user activity patterns
- **Multi-Channel Delivery**: Support for email and in-app notifications
- **User Activity Tracking**: Tracks user behavior to optimize reminder timing
- **Daily Summaries**: Optional daily progress summaries

## Architecture

### Components

1. **NotificationService** (`services/notificationService.ts`)
   - Creates and manages notifications
   - Handles notification delivery (email and in-app)
   - Tracks notification status (pending, sent, failed, read)

2. **UserActivityService** (`services/userActivityService.ts`)
   - Tracks user login times and active hours
   - Records task completions and study time
   - Analyzes activity patterns for intelligent scheduling

3. **ReminderService** (`services/reminderService.ts`)
   - Schedules task reminders based on due dates
   - Uses activity patterns to optimize reminder timing
   - Generates reminder messages
   - Handles reminder cancellation and rescheduling

4. **ScheduledJobsService** (`services/scheduledJobsService.ts`)
   - Runs background jobs to process pending notifications
   - Schedules daily summaries
   - Processes notifications every minute

## Database Schema

### notifications table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- type: VARCHAR (task_reminder, goal_reminder, daily_summary, weekly_report)
- channel: VARCHAR (email, in_app)
- title: VARCHAR
- message: TEXT
- data: JSONB (additional metadata)
- status: VARCHAR (pending, sent, failed, read)
- scheduled_for: TIMESTAMP
- sent_at: TIMESTAMP
- read_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### user_activity table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to users)
- activity_date: DATE
- login_times: JSONB (array of login timestamps)
- active_hours: JSONB (array of active hours)
- tasks_completed: INTEGER
- study_minutes: INTEGER
- last_activity: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Usage

### Scheduling Task Reminders

When a task is added to a learning plan:

```typescript
const learningPlanService = new LearningPlanService();

// Add a task - reminders are automatically scheduled
await learningPlanService.addTask(planId, {
  title: 'Complete Math Practice',
  subject: 'Mathematics',
  type: 'practice',
  estimatedTime: 30,
  priority: 'high',
  status: 'pending',
  dueDate: new Date('2024-12-25T14:00:00'),
});
```

### Intelligent Scheduling

The system analyzes user activity patterns over the last 14 days:

1. **Login Times**: Tracks when users typically log in
2. **Active Hours**: Identifies hours when users are most active
3. **Activity Score**: Calculates engagement level (0-100)

Reminders are scheduled at times when users are most likely to be active.

### Manual Reminder Scheduling

```typescript
const reminderService = new ReminderService();

// Schedule a reminder with custom configuration
await reminderService.scheduleTaskReminder(
  userId,
  task,
  {
    hoursBeforeDue: 2,
    channels: ['in_app', 'email']
  }
);
```

### Processing Notifications

Notifications are automatically processed by the scheduled job service:

```typescript
// Runs every minute automatically
const scheduledJobs = getScheduledJobsService();
scheduledJobs.start();

// Manual trigger (for testing)
await scheduledJobs.triggerNotificationProcessing();
```

### User Notification Preferences

Users can control notifications through their preferences:

```typescript
// User preferences (stored in users table)
{
  notifications: {
    email: true,           // Enable email notifications
    inApp: true,           // Enable in-app notifications
    taskReminders: true,   // Enable task reminders
    weeklyReports: true    // Enable weekly reports
  }
}
```

## API Endpoints

### Get User Notifications
```
GET /api/notifications
Query params: status (optional), limit (optional)
```

### Get Unread Notifications
```
GET /api/notifications/unread
```

### Mark Notification as Read
```
PUT /api/notifications/:id/read
```

### Mark All as Read
```
PUT /api/notifications/read-all
```

### Process Pending Notifications (Admin)
```
POST /api/notifications/process
```

## Integration with Learning Plan Service

The reminder system is integrated into the learning plan service:

```typescript
// When adding a task
await learningPlanService.addTask(planId, task);
// → Automatically schedules reminders

// When updating a task's due date
await learningPlanService.updateTask(planId, taskId, { dueDate: newDate });
// → Reschedules reminders

// When completing a task
await learningPlanService.completeTask(planId, taskId);
// → Cancels pending reminders
// → Records activity for pattern analysis

// When removing a task
await learningPlanService.removeTask(planId, taskId);
// → Cancels all reminders for that task
```

## Activity Tracking

Track user activity for better reminder scheduling:

```typescript
const learningPlanService = new LearningPlanService();

// Record login
await learningPlanService.recordUserLogin(userId);

// Record study time
await learningPlanService.recordStudyTime(userId, 45); // 45 minutes
```

## Email Integration

The notification service includes a placeholder for email delivery. To integrate with an actual email service:

1. Update `NotificationService.sendEmail()` method
2. Add email service credentials to environment variables
3. Integrate with SendGrid, AWS SES, or similar service

Example integration:

```typescript
private async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    // Example with SendGrid
    const msg = {
      to,
      from: process.env.EMAIL_FROM,
      subject,
      text: body,
      html: `<p>${body}</p>`,
    };
    
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
}
```

## Configuration

Environment variables:

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_tutor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Service
LEARNING_PLAN_SERVICE_PORT=3004

# Email (optional)
EMAIL_FROM=noreply@ai-tutor.com
SENDGRID_API_KEY=your_api_key
```

## Running Migrations

Before using the reminder system, run database migrations:

```bash
cd packages/learning-plan-service
npm run migrate
```

## Testing

The reminder system can be tested by:

1. Creating a learning plan with tasks
2. Checking that notifications are created in the database
3. Manually triggering notification processing
4. Verifying notifications are marked as sent

```typescript
// Example test flow
const service = new LearningPlanService();

// Create plan and add task
const plan = await service.createPlan(userId, 'NMT', examDate);
await service.addTask(plan.id, taskData);

// Check notifications were created
const notifications = await notificationService.getUserNotifications(userId);
console.log('Pending notifications:', notifications.filter(n => n.status === 'pending'));

// Process notifications
await reminderService.processPendingNotifications();

// Verify sent
const updated = await notificationService.getUserNotifications(userId);
console.log('Sent notifications:', updated.filter(n => n.status === 'sent'));
```

## Future Enhancements

- Push notifications for mobile apps
- SMS notifications
- Customizable reminder schedules per user
- Smart reminder frequency adjustment based on engagement
- A/B testing for optimal reminder timing
- Weekly progress reports
- Goal deadline reminders
- Streak maintenance reminders
