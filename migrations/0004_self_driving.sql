-- Migration number: 0004
-- The self-driving loop: first-party analytics + goals + memory + hypotheses.
-- Exposed as MCP tools (src/worker/improve.ts) so a coding agent connected to
-- /mcp can measure, decide, and improve holocard session after session.
-- Mission and operating manual: CLAUDE.md.

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 1,
  path TEXT,
  visitor TEXT,
  country TEXT,
  dims TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX idx_events_name_ts ON events (name, ts);
CREATE INDEX idx_events_ts ON events (ts);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metric TEXT NOT NULL,
  target REAL NOT NULL,
  direction TEXT NOT NULL DEFAULT 'up' CHECK (direction IN ('up', 'down')),
  window_days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
  created_at INTEGER NOT NULL
);

CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('observation', 'decision', 'result', 'lesson')),
  content TEXT NOT NULL,
  goal_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_memories_created_at ON memories (created_at DESC);

CREATE TABLE hypotheses (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
  statement TEXT NOT NULL,
  expected_metric TEXT,
  expected_delta TEXT,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'testing', 'confirmed', 'refuted', 'abandoned')),
  evidence TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_hypotheses_status ON hypotheses (status);

-- Seed the mission as goals. The loop's one job: make holocard make money
-- online and become a BR internet trend.
INSERT INTO goals (id, name, description, metric, target, direction, window_days, status, created_at) VALUES
  ('goal-viral-reach', 'Virar trend BR: alcance semanal',
   'Weekly card pageviews. Trend = people opening holocards because other people shared them.',
   'pageview', 10000, 'up', 7, 'active', 1774000000000),
  ('goal-creators', 'Criadores ativos por semana',
   'Cards created per week. Creators are the growth engine: every card is a share loop.',
   'card_created', 100, 'up', 7, 'active', 1774000000000),
  ('goal-revenue', 'Primeira receita (BRL/semana)',
   'Revenue in BRL per week, from track("revenue_brl", { value: amountInBrl }). No monetization exists yet — reaching ANY value > 0 requires shipping one.',
   'revenue_brl', 1, 'up', 7, 'active', 1774000000000);

INSERT INTO memories (id, kind, content, goal_id, created_at) VALUES
  ('mem-genesis', 'observation',
   'Loop initialized. Instrumented so far: pageview (card + home views), card_created, mcp_tool_call, plus a public POST /e beacon for client-side events. NOT instrumented yet: shares, revision usage, editor funnel steps, revenue (no payment path exists). The revenue goal sits at 0 by construction — proposing and shipping a first monetization experiment (e.g. paid premium templates, tip jar on cards, pay-to-unlock extra revisions) is the highest-leverage open problem.',
   'goal-revenue', 1774000000000);
