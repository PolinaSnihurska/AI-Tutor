-- Optimize learning plan database indexes

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_learning_plans_student_exam ON learning_plans(student_id, exam_date) WHERE exam_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_plans_student_updated ON learning_plans(student_id, updated_at DESC);

-- Index for active plans
CREATE INDEX IF NOT EXISTS idx_learning_plans_active ON learning_plans(student_id) WHERE completion_rate < 100;

-- Optimize notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_time) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- GIN index for JSONB fields (for searching within tasks and goals)
CREATE INDEX IF NOT EXISTS idx_learning_plans_daily_tasks_gin ON learning_plans USING gin(daily_tasks);
CREATE INDEX IF NOT EXISTS idx_learning_plans_weekly_goals_gin ON learning_plans USING gin(weekly_goals);
CREATE INDEX IF NOT EXISTS idx_learning_plans_subjects_gin ON learning_plans USING gin(subjects);

-- Analyze tables
ANALYZE learning_plans;
ANALYZE notifications;
