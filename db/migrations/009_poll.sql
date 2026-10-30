-- In-app poll answers: one row per player per poll (one answer per account).
-- The questions live in functions/lib/poll.js; scripts/metrics.mjs reports the totals.
CREATE TABLE IF NOT EXISTS poll_answers (
  poll_id    TEXT    NOT NULL,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers    TEXT    NOT NULL,                      -- JSON: { questionId: [optionId...], other: 'text' }
  created_at INTEGER NOT NULL,                      -- unix ms
  PRIMARY KEY (poll_id, user_id)
);
