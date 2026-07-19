---
name: create-holocard
description: Creates a personalized, standalone holographic HTML card from one photo and a short message. Use when the user asks for a virtual card, photo gift, birthday card, wedding card, congratulations card, holographic card, or shareable keepsake.
---

# Create a Holocard

Create a safe standalone card by filling the fixed manifest and running the renderer. Never generate arbitrary HTML or modify the renderer for user content.

## Inputs

Ask for only what is missing:

1. One local JPG, PNG, or WebP photo, no larger than 8 MB.
2. The occasion and intended recipient.
3. The message or rough sentiment.
4. An optional signature.

Treat photos as private. Do not upload them or send them to a model unless the user explicitly asks.

## Write the manifest

Create a JSON file matching:

```json
{
  "version": 1,
  "locale": "pt-BR",
  "template": "aurora",
  "accent": "rose",
  "customColor": "#e72e83",
  "frame": "silver",
  "pattern": "rays",
  "title": "Short title",
  "message": "One sincere paragraph, at most 320 characters.",
  "signature": "Optional signature",
  "occasion": "Short occasion label",
  "photoHeight": 56,
  "photoPositionX": 50,
  "photoPositionY": 50
}
```

Allowed templates: `aurora`, `confetti`, `keepsake`.

Allowed accents: `rose`, `aqua`, `sun`, `violet`, `mint`, `custom`.

When accent is `custom`, set `customColor` to a six-digit hex color.

Allowed frames: `silver`, `gold`, `prism`, `ink`, `copper`, `pearl`.

Allowed patterns: `none`, `rays`, `grid`, `sparkles`, `waves`, `stars`.

`photoHeight` is an integer from `42` to `68`. Use `56` unless the user asks for a different crop.

`photoPositionX` and `photoPositionY` are integers from `0` to `100`; `50, 50` centers the image.

Improve rough wording without inventing personal facts. Keep the sender’s voice. Never place HTML, Markdown, scripts, URLs, or CSS in text fields.

## Generate

From this repository, execute:

```bash
bun run card:generate -- \
  --manifest path/to/card.json \
  --image path/to/photo.jpg \
  --output path/to/holocard.html
```

The generated HTML embeds the photo, has no runtime dependencies, and can be opened or shared as one file.

## Verify

1. Open the HTML locally.
2. Confirm the title, message, signature, and photo are correct.
3. Check that the card remains readable with reduced motion enabled.
4. Do not claim the file is private after it has been uploaded to a public host.

For complete schema and hosting notes, see [REFERENCE.md](REFERENCE.md).
