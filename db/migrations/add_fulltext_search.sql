-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on article titles for fast fuzzy matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_title_trgm
  ON articles USING gin (title gin_trgm_ops);
