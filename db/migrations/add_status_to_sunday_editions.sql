-- Add status column to sunday_editions for draft/publish workflow
-- Default 'published' to keep existing editions visible
ALTER TABLE sunday_editions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_sunday_editions_status ON sunday_editions(status);
