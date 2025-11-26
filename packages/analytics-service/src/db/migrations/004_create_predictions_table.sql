-- Predictions table for storing success predictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  exam_type VARCHAR(100) NOT NULL,
  predicted_score DECIMAL(5,2) NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_predictions_student_id ON predictions(student_id);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_student_exam ON predictions(student_id, exam_type, created_at DESC);
CREATE INDEX idx_predictions_valid ON predictions(valid_until) WHERE valid_until IS NOT NULL;
