-- In-progress play-mode games, one per company (moved from browser localStorage)
CREATE TABLE IF NOT EXISTS game_sessions (
  company_id TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  saved_at   INTEGER NOT NULL,
  data       TEXT NOT NULL            -- full tracker state JSON
);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
