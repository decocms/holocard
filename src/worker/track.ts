// First-party analytics — the Worker is the collector, events are D1 rows.
// track() must never break a request: errors are swallowed and logged.
// Instrumentation rule: every new surface ships with at least one track()
// call, or the self-driving loop (CLAUDE.md) is blind to it.

export interface TrackOpts {
  value?: number;
  path?: string;
  visitor?: string;
  country?: string;
  dims?: Record<string, string | number | boolean>;
}

export async function track(env: Env, name: string, opts: TrackOpts = {}): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO events (name, value, path, visitor, country, dims, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        name,
        opts.value ?? 1,
        opts.path ?? null,
        opts.visitor ?? null,
        opts.country ?? null,
        opts.dims ? JSON.stringify(opts.dims).slice(0, 512) : null,
        Date.now(),
      )
      .run();
  } catch (error) {
    console.error("track failed", error);
  }
}

/**
 * Cookieless daily unique-visitor id: SHA-256 of salt + UTC day + ip + ua,
 * truncated. Rotates daily — counts uniques, can never follow a person across
 * days. Reuses RATE_LIMIT_SALT so no new secret is needed.
 */
export async function visitorHash(env: Env, request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = env.RATE_LIMIT_SALT ?? "dev-salt";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${day}:${ip}:${ua}`),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function requestCountry(request: Request): string | undefined {
  return (request as Request & { cf?: { country?: string } }).cf?.country;
}
