CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT    PRIMARY KEY,
  encoded    TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
