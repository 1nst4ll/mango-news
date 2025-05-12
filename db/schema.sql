-- Defines the database schema for the Turks and Caicos News Aggregator project.
-- Database Schema for Turks and Caicos News Aggregator

-- Create the 'users' table for authentication and authorization
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin', -- Role for access control (e.g., 'admin', 'editor', 'viewer')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'sources' table
CREATE TABLE sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    enable_ai_summary BOOLEAN DEFAULT TRUE, -- Add column for AI summary toggle
    enable_ai_tags BOOLEAN DEFAULT TRUE, -- Add column for AI tags toggle
    enable_ai_image BOOLEAN DEFAULT TRUE, -- Add column for AI image toggle
    -- Selectors for open-source scraping method
    os_title_selector TEXT,
    os_content_selector TEXT,
    os_date_selector TEXT,
    os_author_selector TEXT,
    os_thumbnail_selector TEXT,
    os_topics_selector TEXT,
    -- Generic include/exclude selectors (might still be useful or can be repurposed)
    include_selectors TEXT, -- Add column for comma-separated CSS selectors to include
    exclude_selectors TEXT, -- Add column for comma-separated CSS selectors to exclude
    article_link_template VARCHAR(255), -- Add column for article link template
    exclude_patterns TEXT, -- Add column for patterns to exclude from links
    scraping_method VARCHAR(50) DEFAULT 'opensource', -- Add column for scraping method
    scrape_after_date TIMESTAMP WITH TIME ZONE, -- Add column for the date to scrape articles after
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'articles' table
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    source_url TEXT, -- Store source URL directly for easier access
    thumbnail_url TEXT, -- Add column for thumbnail image URL
    ai_image_path TEXT, -- Add column for AI generated image path
    author TEXT, -- Add column for article author
    publication_date TIMESTAMP WITH TIME ZONE,
    raw_content TEXT,
    summary TEXT, -- AI-generated summary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for topics/tags (Many-to-Many relationship with articles)
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
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

-- Indexes for better performance
CREATE INDEX idx_articles_publication_date ON articles(publication_date);
CREATE INDEX idx_articles_source_id ON articles(source_id);
CREATE INDEX idx_article_topics_article_id ON article_topics(article_id);
CREATE INDEX idx_article_topics_topic_id ON article_topics(topic_id);
CREATE INDEX idx_sources_is_active ON sources(is_active);
