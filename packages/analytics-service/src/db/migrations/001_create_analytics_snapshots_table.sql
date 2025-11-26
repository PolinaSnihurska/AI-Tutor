-- Analytics snapshots table for storing daily performance data
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  overall_score DECIMAL(5,2),
  subject_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  tests_completed INTEGER DEFAULT 0,
  study_time INTEGER DEFAULT 0,
  improvement_rate DECIMAL(5,2),
  consistency DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, snapshot_date)
);

-- Create indexes for efficient querying
CREATE INDEX idx_analytics_student_id ON analytics_snapshots(student_id);
CREATE INDEX idx_analytics_snapshot_date ON analytics_snapshots(snapshot_date);
CREATE INDEX idx_analytics_student_date ON analytics_snapshots(student_id, snapshot_date DESC);

-- Create partitioning for performance (by month)
-- This will be set up for future scalability
CREATE INDEX idx_analytics_created_at ON analytics_snapshots(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_snapshots_updated_at
  BEFORE UPDATE ON analytics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();
