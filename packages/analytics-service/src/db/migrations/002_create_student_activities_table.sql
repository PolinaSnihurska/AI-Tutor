-- Student activities table for tracking real-time events
CREATE TABLE student_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('test_completed', 'lesson_viewed', 'explanation_requested', 'task_completed', 'login', 'study_session')),
  subject VARCHAR(100),
  topic VARCHAR(200),
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_minutes INTEGER,
  score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_activities_student_id ON student_activities(student_id);
CREATE INDEX idx_activities_created_at ON student_activities(created_at DESC);
CREATE INDEX idx_activities_student_created ON student_activities(student_id, created_at DESC);
CREATE INDEX idx_activities_type ON student_activities(activity_type);
CREATE INDEX idx_activities_subject ON student_activities(subject) WHERE subject IS NOT NULL;

-- Create index for time-series queries
CREATE INDEX idx_activities_student_date ON student_activities(student_id, DATE(created_at));
