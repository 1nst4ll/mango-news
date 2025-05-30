-- Migration to add translation columns to existing tables

-- Add translation columns to the 'articles' table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS title_es TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS summary_es TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS title_ht TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS summary_ht TEXT DEFAULT NULL;

-- Add translation columns to the 'topics' table
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS name_es VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS name_ht VARCHAR(100) DEFAULT NULL;
