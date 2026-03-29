-- Database Schema for Turks and Caicos News Aggregator
-- This is the complete schema for fresh deployments.
-- For existing databases, apply individual migrations in db/migrations/.

-- Create the 'users' table for authentication and authorization
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'sources' table
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    enable_ai_summary BOOLEAN DEFAULT TRUE,
    enable_ai_tags BOOLEAN DEFAULT TRUE,
    enable_ai_image BOOLEAN DEFAULT TRUE,
    enable_ai_translations BOOLEAN DEFAULT TRUE,
    -- Selectors for open-source scraping method
    os_title_selector TEXT,
    os_content_selector TEXT,
    os_date_selector TEXT,
    os_author_selector TEXT,
    os_thumbnail_selector TEXT,
    os_topics_selector TEXT,
    -- Generic include/exclude selectors
    include_selectors TEXT,
    exclude_selectors TEXT,
    article_link_template VARCHAR(255),
    exclude_patterns TEXT,
    scraping_method VARCHAR(50) DEFAULT 'opensource',
    scrape_after_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'articles' table
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    source_url TEXT,
    thumbnail_url TEXT,
    ai_image_path TEXT,
    author TEXT,
    publication_date TIMESTAMP WITH TIME ZONE,
    raw_content TEXT,
    summary TEXT,
    -- Translation columns
    title_es TEXT DEFAULT NULL,
    summary_es TEXT DEFAULT NULL,
    raw_content_es TEXT,
    title_ht TEXT DEFAULT NULL,
    summary_ht TEXT DEFAULT NULL,
    raw_content_ht TEXT,
    topics_es TEXT,
    topics_ht TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for topics/tags
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_es VARCHAR(100) DEFAULT NULL,
    name_ht VARCHAR(100) DEFAULT NULL
);

-- Create a linking table for articles and topics
CREATE TABLE article_topics (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, topic_id)
);

-- Create a table for application-wide settings
CREATE TABLE application_settings (
    setting_name TEXT PRIMARY KEY,
    setting_value TEXT
);

-- Create the 'sunday_editions' table for weekly AI-generated digests
CREATE TABLE sunday_editions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    narration_url TEXT,
    image_url TEXT,
    unreal_speech_task_id VARCHAR(255),
    publication_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_articles_publication_date ON articles(publication_date);
CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_articles_source_url ON articles(source_url);
CREATE INDEX idx_articles_is_blocked ON articles(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_source_pub ON articles(source_id, publication_date DESC);
CREATE INDEX idx_article_topics_article_id ON article_topics(article_id);
CREATE INDEX idx_article_topics_topic_id ON article_topics(topic_id);
CREATE INDEX idx_sources_is_active ON sources(is_active);
