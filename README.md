# Holocard ✦

Turn one photo and one rough message into a personal, interactive holographic card.

Holocard has two deliberately separate layers:

- **Open core:** a deterministic card schema, three templates, a standalone HTML renderer, a CLI, examples, and an agent skill.
- **Managed app:** a Portuguese-first creator, Workers AI text refinement, two revisions, R2 hosting, D1 metadata, share previews, deletion controls, and a bearer-protected MCP endpoint.

The model never writes HTML. It returns a small validated manifest; the fixed renderer escapes every text field and produces the page.

## What Phase 1 includes

- Public photo, message, optional signature, and recovery-password creator, limited per IP/day.
- Browser-side photo optimization before upload.
- `aurora`, `confetti`, and `keepsake` templates.
- A pretty URL derived from the card title.
- Standalone HTML stored in R2 and cached at the edge.
- Fullscreen front/back card with a Holocard logo reverse.
- Accelerometer tilt on supported phones, with mouse hover and touch drag fallbacks.
- Direct text editing plus photo-height, preset/custom color, frame, and background-pattern controls, saved without consuming a revision.
- Editable public slug with collision checks and redirects from every previous URL.
- Open Graph/Twitter metadata and an optional 1200×630 JPEG preview generated in the browser.
- Up to two model-assisted revisions.
- Creator-held edit token for revision and permanent deletion.
- MCP tools for create, revise, get, list, and delete.
- WCAG AA-oriented controls and a complete reduced-motion mode.

Payments are intentionally deferred. Phase 2 will add AbacatePay checkout/webhooks; Phase 3 will add the WhatsApp flow.

## Architecture

```text
Browser / deco studio
        │
        ▼
Cloudflare Worker (Hono)
  ├─ static landing + creator assets
  ├─ /api/cards
  ├─ /mcp  (Bearer token)
  ├─ /media/:id/:kind
  └─ /:slug  → edge cache
        │
        ├─ Workers AI: manifest creation/revision
        ├─ D1: cards, revision history, rate counters
        └─ R2: photo, social JPEG, standalone HTML
```

Creation and revisions use `@cf/openai/gpt-oss-120b` with Workers AI JSON Mode and are validated again with Zod. Creation has a deterministic fallback if AI is unavailable.

## Run locally

Requirements: Bun and a Cloudflare account.

```bash
bun install
cp .dev.vars.example .dev.vars
bun run types
bun run db:local
```

Run the Worker and Vite in separate terminals:

```bash
bun run dev:worker
bun run dev
```

Open `http://localhost:4001`. Vite proxies API, MCP, and media routes to Wrangler on port 8789.

Workers AI is a remote binding even during local development and may consume your Cloudflare allowance.

## Use the open renderer

The local CLI does not upload the photo or call any model:

```bash
bun run card:generate -- \
  --manifest examples/birthday.json \
  --image ./my-photo.jpg \
  --output ./holocard.html
```

The result is one self-contained HTML file with the photo embedded as a data URL.

The repository skill lives at `.agents/skills/create-holocard/SKILL.md`. Copy that directory into another compatible agent project together with this renderer, or use it directly from this repository.

## Deploy to Cloudflare

Authenticate once:

```bash
wrangler login
wrangler whoami
```

The `wrangler.jsonc` configuration uses automatic resource provisioning for:

- D1 database: `holocard`
- R2 bucket: `holocard-cards`
- Workers AI binding: `AI`
- Worker static assets

Create production secrets interactively:

```bash
wrangler secret put MCP_AUTH_TOKEN
wrangler secret put RATE_LIMIT_SALT
```

### Automatic deploys (Workers Builds)

Connect the GitHub repo once in the Cloudflare dashboard so every push to `main` builds and deploys:

1. In the Cloudflare dashboard, open the `holocard` Worker → **Settings** → **Builds**.
2. Under **Git Repository**, select **Connect** and authorize `decocms/holocard`.
3. Use these build settings:
   - Production branch: `main`
   - Build command: `bun run build`
   - Deploy command: `bunx wrangler deploy`
   - Root directory: `/`

After that, pushes to `main` deploy automatically. Non-`main` branches can use the default preview command (`bunx wrangler versions upload`).

### Manual deploy

```bash
bun run deploy
bun run db:remote
```

Production uses `https://holocard.page` as `PUBLIC_ORIGIN`. Change that value in `wrangler.jsonc` if the canonical domain moves.

Validate without publishing:

```bash
bun run deploy:dry
```

## Connect deco studio

Add an external MCP connection:

- URL: `https://<your-worker-or-domain>/mcp`
- Header: `Authorization: Bearer <MCP_AUTH_TOKEN>`

Available tools:

- `create_card` — accepts a public HTTPS image URL, prompt, and recovery password.
- `revise_card` — applies one of two available revisions.
- `update_card` — saves direct text and design changes without consuming a revision.
- `get_card`
- `list_cards`
- `set_social_image` — replaces a card's social preview as the MCP owner.
- `set_card_password` — sets or replaces a card's recovery password as the MCP owner.
- `update_card_slug` — changes the public URL while retaining the previous URL as a redirect.
- `refresh_card_html` — rebuilds stored cards after a template update without consuming revisions.
- `delete_card`

MCP authentication fails closed when `MCP_AUTH_TOKEN` is missing. Query-string tokens are not accepted.

## Data and privacy

- Published photos are public to anyone who has or discovers the card URL.
- The edit token is returned once to the creator and stored only in that browser’s local storage.
- The database stores only a SHA-256 hash of the edit token.
- Recovery passwords use salted PBKDF2-SHA256; plaintext passwords are never stored.
- Password unlocks issue independent editor sessions that expire after 30 days.
- Rate limiting stores a salted daily hash of the connecting IP, never the raw IP.
- Delete removes the D1 record and all known R2 objects.
- The text model receives the prompt and current manifest, not the photo.

This is a pet-project baseline, not an abuse-proof anonymous image host. Before a broad public launch, add Turnstile, WAF rules, moderation, lifecycle cleanup, and an abuse-report path.

## Payment and WhatsApp roadmap

### Phase 2 — AbacatePay

Add an explicit order state machine in D1:

```text
created → awaiting_payment → paid → fulfilled
                      └────→ expired / refunded
```

The verified AbacatePay webhook—not browser redirects and not the LLM—must be the payment authority. Webhook event IDs must be claimed idempotently before fulfillment. Confirm AbacatePay’s supported settlement currencies before promising a literal USD 1 charge; the BRL 5 Pix price is the safe initial product assumption.

### Phase 3 — WhatsApp

Reuse Concierge’s Meta HMAC verification, immediate webhook acknowledgement, Queue jobs, and outbound client. Store order/payment state in D1 or a Durable Object, not KV. The conversation collects the photo and prompt, opens provider-hosted payment, waits for the verified payment webhook, then returns the Holocard URL.

## Security invariants

- No model-authored HTML, CSS, JavaScript, Markdown HTML, or URL fields.
- All user text is escaped before rendering.
- Uploaded image type is checked by signature, not only the MIME header.
- MCP secrets fail closed and are compared without early exit.
- Remote MCP image downloads allow only public HTTPS hosts and are bounded to 8 MB while streaming.
- Every promise is awaited or passed to the Worker execution context.

## Development

```bash
bun run test
bun run check
bun run build
bun run deploy:dry
```

## Attribution

The holographic material interaction is inspired by Simon Goellner’s [poke-holo](https://poke-holo.simey.me/). Holocard uses an original gradient-only implementation and does not include Pokémon artwork, branding, card frames, or upstream GPL source/assets. See `NOTICE`.

MIT licensed.
