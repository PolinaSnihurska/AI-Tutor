-- Create parent_child_links table
CREATE TABLE IF NOT EXISTS parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, child_id),
  CHECK (parent_id != child_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent_id ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child_id ON parent_child_links(child_id);

-- Add constraint to ensure parent has parent role and child has student role
ALTER TABLE parent_child_links
  ADD CONSTRAINT check_parent_role
  CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = parent_id AND role = 'parent'
    )
  );

ALTER TABLE parent_child_links
  ADD CONSTRAINT check_child_role
  CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = child_id AND role = 'student'
    )
  );
