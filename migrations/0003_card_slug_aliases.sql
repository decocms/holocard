CREATE TABLE IF NOT EXISTS card_slug_aliases (
  slug TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS card_slug_aliases_card_id_idx ON card_slug_aliases(card_id);
