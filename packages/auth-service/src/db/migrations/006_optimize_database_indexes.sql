-- Additional database optimizations for performance

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_role_email_verified ON users(role, email_verified) WHERE email_verified = true;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Optimize subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date) WHERE end_date IS NOT NULL;

-- Optimize parent-child link queries
CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child ON parent_child_links(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_created ON parent_child_links(created_at DESC);

-- Optimize usage tracking queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date DESC);

-- Optimize parental controls queries
CREATE INDEX IF NOT EXISTS idx_parental_controls_child ON parental_controls(child_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_parent ON parental_controls(parent_id);

-- Add partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_active_subscriptions ON subscriptions(user_id) WHERE status = 'active';

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE subscriptions;
ANALYZE parent_child_links;
ANALYZE usage_tracking;
ANALYZE parental_controls;
