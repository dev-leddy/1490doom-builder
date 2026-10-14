-- Campaign activity log: one row per thing that happened in a campaign company
-- (game recorded, upgrade bought, recruit undone, ...). Written with company saves;
-- read by GET /api/companies/:id/events. See functions/lib/campaignEvents.js.
CREATE TABLE IF NOT EXISTS campaign_events (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,  -- server order, used for paging
  id         TEXT    NOT NULL UNIQUE,            -- client uuid (a resent event is ignored)
  company_id TEXT    NOT NULL,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,                   -- e.g. 'game.recorded', 'upgrade.bought'
  after_game INTEGER NOT NULL DEFAULT 0,         -- games played when it happened
  ref        TEXT,                               -- undo events: id of the event taken back
  payload    TEXT    NOT NULL DEFAULT '{}',      -- JSON, at most 4 KB
  client_at  INTEGER,                            -- unix ms on the device
  server_at  INTEGER NOT NULL,                   -- unix ms when stored
  device     TEXT,
  status     TEXT    NOT NULL DEFAULT 'ok'       -- 'ok' | 'rejected' (sent with a save that lost a conflict)
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_company ON campaign_events(company_id, seq);
