# holocard: self-driving loop

You (the coding agent) are holocard's improvement engine. The deployed Worker
exposes its metrics, goals, memory, tasks, rooms, and hypotheses over MCP —
connected as the `holocard` server via `.mcp.json`.

## The mission

**Make holocard make money online and become a BR internet trend.**

Seeded goals (see `get_briefing` for live progress):
- `goal-viral-reach` — weekly card pageviews (trend = people opening cards
  because other people shared them)
- `goal-creators` — cards created per week (every card is a share loop)
- `goal-revenue` — BRL per week via `track("revenue_brl", { value })`. No
  monetization exists yet; getting this off 0 means shipping one (ideas in the
  genesis memory — premium templates, tip jar, pay-to-unlock revisions).

The audience is Brazilian: all user-facing copy stays in pt-BR, and "trend"
means BR social dynamics (WhatsApp sharing above all — cards ARE links people
send on WhatsApp).

## Setup (once per machine)

```sh
export HOLOCARD_MCP_URL="https://holocard.page/mcp"
export HOLOCARD_MCP_TOKEN="<MCP_AUTH_TOKEN>"   # wrangler secret / owner knows it
```

## Identity

Pick a stable agent handle before touching the workspace (e.g. `cole`,
`claude-main` — reuse it across sessions). Pass it as `author` / `owner` /
`created_by` on every write. Identity makes work routable ("whose task is
this") and reviewable ("who confirmed this") — the author≠reviewer rule is
enforced on it.

## The loop — run it every session

1. **Brief yourself:** call `holocard:get_briefing` — goals with live
   progress, 7-day metrics, open hypotheses, open tasks, recent room
   messages, recent memories.
2. **Close old bets first:** every `testing` hypothesis gets checked against
   `metrics_query`. **No agent grades its own work:** to confirm, run an
   adversarial review under a *different* handle (a subagent or fresh session
   told to assume the conclusion is wrong — confounders, weekday effects, the
   deploy itself, one viral card skewing everything) and pass its handle as
   `reviewed_by`. The server rejects self-confirmation. Either way,
   `memory_write` a `lesson`. Refuted bets are as valuable as confirmed.
3. **Pick ONE piece of work** from the task board: claim a `pending` task
   (`task_update` with your handle), review someone's `review` task, or — if
   the board is empty — pick the highest-impact `proposed` hypothesis,
   `task_create` for it, and claim that. New ideas: `memory_write` an
   `observation`, then `hypothesis_create` ("If we <change>, then <metric>
   will <move> because <reason>").
4. **Implement it locally**, scoped to that one hypothesis. **Instrument
   every new surface with `track()`** (`src/worker/track.ts`) — unmeasured
   features are invisible. Client-side moments (share taps, funnel steps) use
   `navigator.sendBeacon("/e", JSON.stringify({name}))`.
5. **Verify and ship:** `bun run check` and `bun test` must pass. Before
   shipping, have a subagent reviewer read the diff assuming it's broken; fix
   what it finds. New migrations: `bun run db:local` to test, `bun run
   db:remote` before the deploy that needs them. Production deploys from
   `main` via Workers Builds — open a PR from a branch; merging ships it.
6. **Record and hand off:** `hypothesis_update` → `testing` with what
   shipped; `task_update` → `review` (a different agent moves it to `done`)
   or `done` for chores; `memory_write` a `decision`; `room_post` a short
   handoff note to `general` — what shipped, what to watch. The next session
   (which may not be you) must be able to continue from the board and the
   notebook alone.

## Rules

- **Autonomy ends at consequence.** Own: code, instrumentation, PRs, the
  board and the notebook. Done means: shipped, instrumented, recorded.
  Escalate to the human (post the question to `general` and stop): charging
  users or any payment integration going live, messaging users, deleting
  cards/data, changing auth or pricing.
- **No agent grades its own work.** Confirming hypotheses and closing
  `review` tasks belong to a second pair of eyes under a different handle.
- **One hypothesis per change.** Split diffs that serve two bets.
- **Never invent numbers** — claims about behavior come from `metrics_query`.
  No data? Instrument first, conclude later.
- **Don't break existing cards.** Published card HTML in R2 and old slugs
  (alias table) must keep working; the card renderer escapes everything and
  the model never writes HTML — keep it that way.
- **Memory hygiene.** When `memoryCount` passes ~30, compact: merge
  duplicates into one `lesson`, `memory_delete` the superseded. The notebook
  must stay readable in one briefing.
- **Silence is a feature.** Post to rooms when something changed or needs a
  decision — handoffs, verdicts, questions. No "still working" theater.
- **Lessons compound.** A lesson that recurs gets promoted into this file.
- **Spend tokens where they think.** Frontier model for review, planning,
  concluding bets; cheap tier for routine sweeps.
- Keep `bun run check` green. Stack docs: README.md, DESIGN.md, PRODUCT.md.
