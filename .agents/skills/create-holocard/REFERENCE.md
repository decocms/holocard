# Holocard reference

## Field limits

- `title`: 1–60 characters
- `message`: 1–320 characters
- `signature`: 0–60 characters
- `occasion`: 1–40 characters
- `locale`: BCP 47 language tag, 2–12 characters
- `photoHeight`: integer from 42–68
- `photoPositionX`: integer from 0–100
- `photoPositionY`: integer from 0–100
- `customColor`: six-digit hex color used when `accent` is `custom`

The renderer validates these limits and rejects unknown templates or accents.

## Template selection

- `aurora`: versatile default with a concentrated color bloom.
- `confetti`: birthdays, congratulations, graduations, and energetic celebrations.
- `keepsake`: weddings, anniversaries, memorials, thanks, and quieter messages.

Frames: `silver`, `gold`, `prism`, `ink`, `copper`, `pearl`.

Patterns: `none`, `rays`, `grid`, `sparkles`, `waves`, `stars`.

## Hosting

The CLI output is a self-contained HTML document. Any static host can serve it. Use an HTTPS URL for reliable sharing.

For WhatsApp and other rich previews, a hosted service should add absolute Open Graph image metadata pointing to a 1200×630 JPEG or PNG. The managed Holocard Worker in this repository does this automatically.

## Security

User content is rendered only as escaped text. Do not add `dangerouslySetInnerHTML`, model-generated markup, remote scripts, or untrusted `data:` content to the template.

## Attribution

The gradient-only implementation is original to this repository and inspired by Simon Goellner’s poke-holo demonstration. Keep the attribution link in generated cards and the repository NOTICE.
