-- Performance indexes for frequently-queried columns
-- Use CONCURRENTLY to avoid table locks on live database

-- Used for duplicate detection on every scrape cycle
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_source_url ON articles(source_url);

-- Used in every public article query (WHERE a.is_blocked = FALSE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_is_blocked ON articles(is_blocked) WHERE is_blocked = TRUE;

-- Used for sorting by creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- Common filter combination: source-specific article listings sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_source_pub ON articles(source_id, publication_date DESC);
