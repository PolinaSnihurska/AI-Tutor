-- Optimize analytics database indexes and queries

-- Composite indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_student_date_score ON analytics_snapshots(student_id, snapshot_date DESC, overall_score);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_analytics_date_range ON analytics_snapshots(snapshot_date) WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days';

-- Optimize student activities queries
CREATE INDEX IF NOT EXISTS idx_student_activities_student_date ON student_activities(student_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_activities_type ON student_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_student_activities_subject ON student_activities(subject);

-- Optimize topic performance queries
CREATE INDEX IF NOT EXISTS idx_topic_performance_student ON topic_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_performance_subject_topic ON topic_performance(subject, topic);
CREATE INDEX IF NOT EXISTS idx_topic_performance_error_rate ON topic_performance(error_rate DESC);

-- Optimize predictions queries
CREATE INDEX IF NOT EXISTS idx_predictions_student ON predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_predictions_exam_type ON predictions(exam_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at DESC);

-- Create materialized view for frequently accessed analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_performance_summary AS
SELECT 
  student_id,
  MAX(snapshot_date) as last_snapshot_date,
  AVG(overall_score) as avg_score,
  SUM(tests_completed) as total_tests,
  SUM(study_time) as total_study_time,
  AVG(improvement_rate) as avg_improvement,
  AVG(consistency) as avg_consistency
FROM analytics_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY student_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_student_performance_student ON mv_student_performance_summary(student_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_student_performance_summary()
RETURNS void AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_performance_summary;
END;
$ LANGUAGE plpgsql;

-- Analyze tables
ANALYZE analytics_snapshots;
ANALYZE student_activities;
ANALYZE topic_performance;
ANALYZE predictions;
