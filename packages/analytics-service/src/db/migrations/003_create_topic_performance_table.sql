-- Topic performance table for heatmap generation
CREATE TABLE topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  attempts_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  last_attempt_at TIMESTAMP,
  first_attempt_at TIMESTAMP,
  trend VARCHAR(20) CHECK (trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, subject, topic)
);

-- Create indexes for efficient querying
CREATE INDEX idx_topic_perf_student_id ON topic_performance(student_id);
CREATE INDEX idx_topic_perf_subject ON topic_performance(subject);
CREATE INDEX idx_topic_perf_error_rate ON topic_performance(error_rate DESC);
CREATE INDEX idx_topic_perf_student_subject ON topic_performance(student_id, subject);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER topic_performance_updated_at
  BEFORE UPDATE ON topic_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();
