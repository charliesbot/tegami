-- new schema.sql

-- Stores user information
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,    -- Unique user ID (e.g., 'user-a-uuid')
  alias TEXT UNIQUE,      -- A short, unique alias like 'your-name'
  email TEXT UNIQUE       -- The user's actual login email (e.g., 'your-name@gmail.com')
);

-- Stores a single, unique copy of each newsletter edition
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,                  -- Unique article ID
  content_hash TEXT UNIQUE NOT NULL,    -- A SHA-256 hash of the HTML body to detect duplicates
  r2_object_key TEXT NOT NULL,
  subject TEXT,
  sender TEXT
);

CREATE TABLE IF NOT EXISTS inbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  read_status INTEGER DEFAULT 0 NOT NULL, -- 0: unread, 1: read, 2: archived
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

