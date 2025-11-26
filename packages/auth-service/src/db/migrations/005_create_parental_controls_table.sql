-- Parental controls table
CREATE TABLE IF NOT EXISTS parental_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_time_limit_minutes INTEGER, -- NULL means no limit
  content_restrictions JSONB DEFAULT '[]'::jsonb,
  allowed_subjects JSONB, -- NULL means all subjects allowed
  blocked_features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, child_id)
);

-- Activity log for parent review
CREATE TABLE IF NOT EXISTS child_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_details JSONB NOT NULL,
  duration_minutes INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flagged BOOLEAN DEFAULT false,
  flag_reason VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parental_controls_parent ON parental_controls(parent_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_child ON parental_controls(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_child ON child_activity_log(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON child_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_flagged ON child_activity_log(flagged) WHERE flagged = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parental_controls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER parental_controls_updated_at
  BEFORE UPDATE ON parental_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_parental_controls_updated_at();
