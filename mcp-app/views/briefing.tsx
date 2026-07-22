import { useCallback, useEffect, useState } from "react";
import { useCallTool } from "../context";

interface Goal {
  id: string;
  name: string;
  metric: string;
  target: number;
  current: number;
  achieved: boolean;
  window_days: number;
}

interface MetricRow {
  name: string;
  events: number;
  value: number;
}

interface Hypothesis {
  id: string;
  statement: string;
  status: string;
  author: string | null;
  expected_metric: string | null;
  expected_delta: string | null;
}

interface Memory {
  id: string;
  kind: string;
  content: string;
  author: string | null;
}

interface Briefing {
  mission: string;
  goals: Goal[];
  metrics7d: MetricRow[];
  traffic7d: { pageviews: number; uniques: number } | null;
  openHypotheses: Hypothesis[];
  recentMemories: Memory[];
  memoryCount: number;
}

export function BriefingView() {
  const callTool = useCallTool();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBriefing(await callTool<Briefing>("get_briefing"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [callTool]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) return <p className="error">{error}</p>;
  if (!briefing) return <p className="muted">Loading briefing…</p>;

  return (
    <div>
      <h1>Mission briefing</h1>
      <p className="muted">{briefing.mission}</p>

      <h2>Goals</h2>
      {briefing.goals.map((g) => {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        return (
          <div key={g.id} className="goal">
            <div className="goal-head">
              <strong>{g.name}</strong>
              <span className="muted">
                {g.current} / {g.target} {g.metric} · {g.window_days}d {g.achieved ? "✓" : ""}
              </span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}

      <h2>Traffic (7d)</h2>
      <div className="pills">
        <span className="pill">{briefing.traffic7d?.pageviews ?? 0} pageviews</span>
        <span className="pill">{briefing.traffic7d?.uniques ?? 0} uniques</span>
        <span className="pill">{briefing.memoryCount} memories</span>
      </div>
      <ul className="list">
        {briefing.metrics7d.map((m) => (
          <li key={m.name}>
            <strong>{m.name}</strong>
            <span className="muted">
              {m.events} events · value {m.value}
            </span>
          </li>
        ))}
      </ul>

      <h2>Open hypotheses</h2>
      <ul className="list">
        {briefing.openHypotheses.map((h) => (
          <li key={h.id}>
            <div>
              <strong>
                [{h.status}] {h.author ?? "?"}
              </strong>
              <p className="muted">{h.statement}</p>
              {h.expected_metric && (
                <p className="muted">
                  expects {h.expected_metric} {h.expected_delta ?? ""}
                </p>
              )}
            </div>
          </li>
        ))}
        {briefing.openHypotheses.length === 0 && <li className="muted">No open bets.</li>}
      </ul>

      <h2>Recent memories</h2>
      <ul className="list">
        {briefing.recentMemories.map((m) => (
          <li key={m.id}>
            <div>
              <strong>
                {m.kind}
                {m.author ? ` · ${m.author}` : ""}
              </strong>
              <p className="muted">{m.content}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
