CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  edit_token_hash TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  social_key TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0 CHECK (revision_count BETWEEN 0 AND 2),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS cards_updated_at_idx ON cards(updated_at DESC);

CREATE TABLE IF NOT EXISTS card_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(card_id, revision_number)
);

CREATE TABLE IF NOT EXISTS usage_limits (
  identity_hash TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(identity_hash, window_start)
);
