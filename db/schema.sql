-- 1490 DOOM Builder — Cloud Database Schema

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,        -- 'discord' | 'google'
  provider_id TEXT NOT NULL,        -- OAuth subject ID from provider
  username    TEXT,
  avatar_url  TEXT,
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

CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
