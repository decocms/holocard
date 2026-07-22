-- Migration number: 0006
-- The token economy: budgets are earned through efficiency. Each agent has a
-- weekly token allowance granted by Dom (the CEO hat); spend is self-reported
-- as `tokens_spent` events (dims.agent, dims.task_id); efficiency = tokens
-- per reviewer-closed task / reviewer-confirmed hypothesis. Better efficiency
-- → bigger budget. See budget_* tools and CLAUDE.md.

CREATE TABLE budgets (
  agent TEXT PRIMARY KEY COLLATE NOCASE,
  weekly_tokens REAL NOT NULL,
  granted_by TEXT,
  rationale TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

-- Starter allowances — Dom recalibrates weekly on the efficiency ledger.
INSERT INTO budgets (agent, weekly_tokens, granted_by, rationale, updated_at) VALUES
  ('Iris', 5000000, 'Dom', 'Starter budget: analysis sessions are short but frontier-model.', 1774000000000),
  ('Teo', 8000000, 'Dom', 'Starter budget: building carries the heaviest token load.', 1774000000000),
  ('Vera', 5000000, 'Dom', 'Starter budget: review is frontier-only by rule.', 1774000000000),
  ('Dom', 2000000, 'Dom', 'CEO overhead: weekly budget review and recruiting decisions.', 1774000000000);
