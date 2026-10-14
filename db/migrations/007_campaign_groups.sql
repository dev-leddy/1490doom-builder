-- Campaign groups: players who join a campaign together and see each other's companies
-- (roster, results, log; read-only). One row per group; members are companies.
-- See functions/lib/groups.js and functions/api/campaign-groups/.
CREATE TABLE IF NOT EXISTS campaign_groups (
  id              TEXT    PRIMARY KEY,                -- uuid
  name            TEXT,                               -- optional, set by whoever started it
  invite_code     TEXT    NOT NULL UNIQUE,            -- 8 chars of unambiguous base32, shown XXXX-XXXX
  code_expires_at INTEGER NOT NULL,                   -- unix ms; a new code replaces the old one
  created_by      TEXT    REFERENCES users(id) ON DELETE SET NULL,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_group_members (
  group_id     TEXT    NOT NULL REFERENCES campaign_groups(id) ON DELETE CASCADE,
  company_id   TEXT    NOT NULL,
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT,                                  -- name when it joined (shown if the company is gone)
  joined_at    INTEGER NOT NULL,
  left_at      INTEGER,                               -- NULL while a member
  left_reason  TEXT,                                  -- 'left' | 'deleted'
  PRIMARY KEY (group_id, company_id)
);

-- A company is in at most one group at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_active_company
  ON campaign_group_members(company_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_user ON campaign_group_members(user_id);
