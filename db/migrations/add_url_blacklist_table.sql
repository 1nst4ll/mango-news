-- Migration: add_url_blacklist_table
-- Creates a persistent URL blacklist table, replacing config/blacklist.json

CREATE TABLE IF NOT EXISTS url_blacklist (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
