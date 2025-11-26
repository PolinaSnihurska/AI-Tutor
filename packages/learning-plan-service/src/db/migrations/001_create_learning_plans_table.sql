-- Create learning_plans table
CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type VARCHAR(50),
  exam_date DATE,
  subjects JSONB NOT NULL DEFAULT '[]',
  daily_tasks JSONB NOT NULL DEFAULT '[]',
  weekly_goals JSONB NOT NULL DEFAULT '[]',
  completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_learning_plans_student_id ON learning_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_exam_date ON learning_plans(exam_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_plans_updated_at
  BEFORE UPDATE ON learning_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_plans_updated_at();
