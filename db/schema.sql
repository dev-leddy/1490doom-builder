-- 1490 DOOM Builder — Cloud Database Schema

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,        -- 'discord' | 'google'
  provider_id TEXT NOT NULL,        -- OAuth subject ID from provider
  username    TEXT,
  avatar_url  TEXT,
  display_name TEXT,                -- chosen by the user; overrides username (005)
  created_at  INTEGER NOT NULL,
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,      -- 32-byte random hex token
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL       -- unix ms, 30-day rolling TTL
);

CREATE TABLE IF NOT EXISTS companies (
  id       TEXT PRIMARY KEY,        -- companyId UUID (same as client-side uuid)
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  mode     TEXT NOT NULL DEFAULT 'standard',  -- 'standard' | 'campaign'
  saved_at INTEGER NOT NULL,
  data     TEXT NOT NULL            -- full JSON blob, same shape as doom_saves entries
);

CREATE TABLE IF NOT EXISTS game_sessions (
  company_id TEXT PRIMARY KEY,      -- one in-progress game per company
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_at   INTEGER NOT NULL,
  data       TEXT NOT NULL          -- full tracker state JSON
);

-- Short share links /s/<code> (002, 003)
CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT    PRIMARY KEY,
  encoded    TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

-- Campaign activity log (006)
CREATE TABLE IF NOT EXISTS campaign_events (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,  -- server order, used for paging
  id         TEXT    NOT NULL UNIQUE,            -- client uuid (a resent event is ignored)
  company_id TEXT    NOT NULL,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  after_game INTEGER NOT NULL DEFAULT 0,         -- games played when it happened
  ref        TEXT,                               -- undo events: id of the event taken back
  payload    TEXT    NOT NULL DEFAULT '{}',      -- JSON, at most 4 KB
  client_at  INTEGER,
  server_at  INTEGER NOT NULL,
  device     TEXT,
  status     TEXT    NOT NULL DEFAULT 'ok'       -- 'ok' | 'rejected'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_encoded ON short_links(encoded);
CREATE INDEX IF NOT EXISTS idx_campaign_events_company ON campaign_events(company_id, seq);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
