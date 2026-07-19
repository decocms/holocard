ALTER TABLE cards ADD COLUMN password_hash TEXT;
ALTER TABLE cards ADD COLUMN password_salt TEXT;

CREATE TABLE IF NOT EXISTS editor_sessions (
  token_hash TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS editor_sessions_card_id_idx ON editor_sessions(card_id);
CREATE INDEX IF NOT EXISTS editor_sessions_expires_at_idx ON editor_sessions(expires_at);
