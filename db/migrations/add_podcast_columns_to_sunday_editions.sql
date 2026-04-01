-- Add podcast support columns to sunday_editions
-- podcast_script stores the multi-speaker dialogue for TTS generation
-- edition_format tracks whether each edition was generated as monologue or podcast
ALTER TABLE sunday_editions
ADD COLUMN IF NOT EXISTS podcast_script TEXT;

ALTER TABLE sunday_editions
ADD COLUMN IF NOT EXISTS edition_format VARCHAR(20) DEFAULT 'monologue';
