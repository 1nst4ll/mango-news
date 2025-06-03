-- Migration to add enable_ai_translations column to the 'sources' table
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS enable_ai_translations BOOLEAN DEFAULT TRUE;
