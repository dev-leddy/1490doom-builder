-- Usage metrics: one row per thing worth counting (store clicks, games started and ended,
-- companies created). Aggregated by scripts/metrics.mjs; nothing in the app reads it.
CREATE TABLE IF NOT EXISTS metric_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT    NOT NULL,                      -- 'store_click' | 'game_start' | 'game_end' | 'company_create'
  user_id    TEXT    REFERENCES users(id) ON DELETE SET NULL, -- NULL for guests
  props      TEXT    NOT NULL DEFAULT '{}',         -- JSON, small
  created_at INTEGER NOT NULL                       -- unix ms
);

CREATE INDEX IF NOT EXISTS idx_metric_events_kind ON metric_events(kind, created_at);
