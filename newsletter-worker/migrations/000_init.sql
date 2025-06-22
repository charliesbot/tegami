-- new schema.sql

-- Stores user information.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,    -- Unique user ID (e.g., 'user-a-uuid').
  alias TEXT UNIQUE,      -- A short, unique alias like 'your-name'. alias@tegami.dev.
  email TEXT UNIQUE,       -- The user's actual login email (e.g., 'your-name@gmail.com').
  created_at TEXT DEFAULT (datetime('now')) -- When the user was created.
);

-- Stores a single, unique copy of each newsletter edition.
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,                  -- Unique article ID.
  content_hash TEXT UNIQUE NOT NULL,    -- A SHA-256 hash of the HTML body to detect duplicates.
  r2_object_key TEXT NOT NULL,          -- The R2 object key for the article.
  subject TEXT,                         -- The subject of the article.
  sender TEXT,                          -- The sender of the article.
  created_at TEXT DEFAULT (datetime('now')) -- When the article was created.
);

-- Keeps track of which articles have been sent to which users.
CREATE TABLE IF NOT EXISTS inbox (
  id           TEXT PRIMARY KEY,                  -- Unique inbox ID.
  user_id      TEXT NOT NULL,                     -- The user ID.
  article_id   TEXT NOT NULL,                     -- The article ID.
  tag          TEXT,                             -- ("nytimes", "promo", ...)
  received_at  TEXT NOT NULL,                    -- When the article was received.
  read_status  INTEGER DEFAULT 0 NOT NULL,       -- 0: unread, 1: read, 2: archived.
  UNIQUE(user_id, article_id),                  -- Prevent duplicated articles for the same user.
  FOREIGN KEY (user_id)    REFERENCES users(id), -- Foreign key to users table.
  FOREIGN KEY (article_id) REFERENCES articles(id) -- Foreign key to articles table.
);



