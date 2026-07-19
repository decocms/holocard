import { renderCardDocument, slugify } from "@/core/card";
import { CardManifestSchema, type PublicCard, type StoredCard } from "@/core/types";
import { createManifest, reviseManifest } from "./ai";
import { hashPassword, passwordMatches, randomToken, sha256, tokenMatches } from "./auth";

interface CardRow {
  id: string;
  slug: string;
  edit_token_hash: string;
  manifest_json: string;
  photo_key: string;
  social_key: string | null;
  password_hash: string | null;
  password_salt: string | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 404 | 409 | 413 | 429 | 500,
    message: string,
  ) {
    super(message);
  }
}

export async function consumeCreateLimit(env: Env, request: Request): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const identityHash = await sha256(`${env.RATE_LIMIT_SALT ?? "holocard-local"}:${ip}`);
  const windowStart = new Date().toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `INSERT INTO usage_limits (identity_hash, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(identity_hash, window_start)
     DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(identityHash, windowStart)
    .first<{ count: number }>();
  const limit = Number.parseInt(env.DAILY_CREATE_LIMIT, 10) || 5;
  if ((result?.count ?? limit + 1) > limit) {
    throw new HttpError(429, `Limite diário de ${limit} cartões atingido. Tente amanhã.`);
  }
}

export async function consumeUnlockLimit(env: Env, request: Request, slug: string): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const identityHash = await sha256(
    `${env.RATE_LIMIT_SALT ?? "holocard-local"}:unlock:${slug}:${ip}`,
  );
  const windowStart = new Date().toISOString().slice(0, 13);
  const result = await env.DB.prepare(
    `INSERT INTO usage_limits (identity_hash, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(identity_hash, window_start)
     DO UPDATE SET count = count + 1
     RETURNING count`,
  )
    .bind(identityHash, windowStart)
    .first<{ count: number }>();
  if ((result?.count ?? 13) > 12) {
    throw new HttpError(429, "Muitas tentativas. Aguarde uma hora e tente novamente.");
  }
}

export async function createCard(
  env: Env,
  input: {
    prompt: string;
    signature?: string;
    password: string;
    photo: ArrayBuffer;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    origin: string;
  },
): Promise<PublicCard & { editToken: string }> {
  const manifest = await createManifest(env, input.prompt, input.signature);
  const id = crypto.randomUUID();
  const editToken = randomToken();
  const editTokenHash = await sha256(editToken);
  const passwordRecord = await hashPassword(input.password);
  const slug = await allocateSlug(env, manifest.title, id);
  const photoKey = `cards/${id}/photo.${extensionFor(input.contentType)}`;
  const now = new Date().toISOString();

  await env.CARDS.put(photoKey, input.photo, {
    httpMetadata: {
      contentType: input.contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { cardId: id, kind: "photo" },
  });

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO cards
          (id, slug, edit_token_hash, password_hash, password_salt, manifest_json, photo_key, revision_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).bind(
        id,
        slug,
        editTokenHash,
        passwordRecord.hash,
        passwordRecord.salt,
        JSON.stringify(manifest),
        photoKey,
        now,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO card_revisions
          (card_id, revision_number, instruction, manifest_json, created_at)
         VALUES (?, 0, ?, ?, ?)`,
      ).bind(id, input.prompt, JSON.stringify(manifest), now),
    ]);
    const row = await getCardRowById(env, id);
    if (!row) throw new Error("Card insert did not persist");
    await writeCardHtml(env, row, input.origin);
    return { ...toPublicCard(row, input.origin), editToken };
  } catch (error) {
    await env.CARDS.delete(photoKey);
    throw error;
  }
}

export async function setSocialImage(
  env: Env,
  id: string,
  editToken: string,
  image: ArrayBuffer,
  origin: string,
  ownerOverride = false,
): Promise<PublicCard> {
  const row = ownerOverride
    ? await getCardRowById(env, id)
    : await requireEditableCard(env, id, editToken);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  const socialKey = `cards/${id}/social.jpg`;
  await env.CARDS.put(socialKey, image, {
    httpMetadata: {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: { cardId: id, kind: "social" },
  });
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE cards SET social_key = ?, updated_at = ? WHERE id = ?")
    .bind(socialKey, now, id)
    .run();
  const updated = { ...row, social_key: socialKey, updated_at: now };
  await writeCardHtml(env, updated, origin);
  await purgeCardCache(origin, row.slug);
  return toPublicCard(updated, origin);
}

export async function reviseCard(
  env: Env,
  input: {
    id: string;
    instruction: string;
    origin: string;
    editToken?: string;
    ownerOverride?: boolean;
  },
): Promise<PublicCard> {
  const row = await getCardRowById(env, input.id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!input.ownerOverride && !(await canEditCard(env, row, input.editToken ?? null))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  if (row.revision_count >= 2) throw new HttpError(409, "Este cartão já usou as duas revisões.");

  const current = CardManifestSchema.parse(JSON.parse(row.manifest_json));
  const manifest = await reviseManifest(env, current, input.instruction);
  const revisionNumber = row.revision_count + 1;
  const now = new Date().toISOString();

  const result = await env.DB.prepare(
    `UPDATE cards
     SET manifest_json = ?, revision_count = revision_count + 1, updated_at = ?
     WHERE id = ? AND revision_count = ?`,
  )
    .bind(JSON.stringify(manifest), now, row.id, row.revision_count)
    .run();
  if (result.meta.changes !== 1) {
    throw new HttpError(409, "O cartão foi revisado em outra janela. Atualize e tente novamente.");
  }
  await env.DB.prepare(
    `INSERT INTO card_revisions
      (card_id, revision_number, instruction, manifest_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(row.id, revisionNumber, input.instruction, JSON.stringify(manifest), now)
    .run();

  const updated: CardRow = {
    ...row,
    manifest_json: JSON.stringify(manifest),
    revision_count: revisionNumber,
    updated_at: now,
  };
  await writeCardHtml(env, updated, input.origin);
  await purgeCardCache(input.origin, row.slug);
  return toPublicCard(updated, input.origin);
}

export async function updateCardManifest(
  env: Env,
  input: {
    id: string;
    manifest: unknown;
    origin: string;
    editToken?: string;
    ownerOverride?: boolean;
  },
): Promise<PublicCard> {
  const row = await getCardRowById(env, input.id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!input.ownerOverride && !(await canEditCard(env, row, input.editToken ?? null))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  const parsed = CardManifestSchema.safeParse(input.manifest);
  if (!parsed.success) throw new HttpError(400, "O cartão contém campos inválidos.");
  const manifest = parsed.data;
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE cards SET manifest_json = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(manifest), now, row.id)
    .run();
  const updated: CardRow = {
    ...row,
    manifest_json: JSON.stringify(manifest),
    updated_at: now,
  };
  await writeCardHtml(env, updated, input.origin);
  await purgeCardCache(input.origin, row.slug);
  return toPublicCard(updated, input.origin);
}

export async function updateCardSlug(
  env: Env,
  input: {
    id: string;
    slug: string;
    origin: string;
    editToken?: string;
    ownerOverride?: boolean;
  },
): Promise<PublicCard> {
  const row = await getCardRowById(env, input.id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!input.ownerOverride && !(await canEditCard(env, row, input.editToken ?? null))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  const nextSlug = slugify(input.slug);
  if (nextSlug === row.slug) return toPublicCard(row, input.origin);

  const existingCard = await env.DB.prepare("SELECT id FROM cards WHERE slug = ? AND id != ?")
    .bind(nextSlug, row.id)
    .first<{ id: string }>();
  const existingAlias = await env.DB.prepare(
    "SELECT card_id FROM card_slug_aliases WHERE slug = ? AND card_id != ?",
  )
    .bind(nextSlug, row.id)
    .first<{ card_id: string }>();
  if (existingCard || existingAlias) {
    throw new HttpError(409, "Essa URL já está sendo usada por outro cartão.");
  }

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM card_slug_aliases WHERE slug = ? AND card_id = ?").bind(
      nextSlug,
      row.id,
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO card_slug_aliases (slug, card_id, created_at) VALUES (?, ?, ?)",
    ).bind(row.slug, row.id, now),
    env.DB.prepare("UPDATE cards SET slug = ?, updated_at = ? WHERE id = ?").bind(
      nextSlug,
      now,
      row.id,
    ),
  ]);

  const updated: CardRow = { ...row, slug: nextSlug, updated_at: now };
  await writeCardHtml(env, updated, input.origin);
  await Promise.all([
    purgeCardCache(input.origin, row.slug),
    purgeCardCache(input.origin, nextSlug),
  ]);
  return toPublicCard(updated, input.origin);
}

export async function updateCardPassword(
  env: Env,
  input: {
    id: string;
    password: string;
    editToken?: string;
    ownerOverride?: boolean;
  },
): Promise<void> {
  const row = await getCardRowById(env, input.id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!input.ownerOverride && !(await canEditCard(env, row, input.editToken ?? null))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  if (input.password.length < 8 || input.password.length > 128) {
    throw new HttpError(400, "A senha deve ter entre 8 e 128 caracteres.");
  }
  const passwordRecord = await hashPassword(input.password);
  await env.DB.prepare("UPDATE cards SET password_hash = ?, password_salt = ? WHERE id = ?")
    .bind(passwordRecord.hash, passwordRecord.salt, row.id)
    .run();
}

export async function deleteCard(
  env: Env,
  input: { id: string; origin: string; editToken?: string; ownerOverride?: boolean },
): Promise<void> {
  const row = await getCardRowById(env, input.id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!input.ownerOverride && !(await canEditCard(env, row, input.editToken ?? null))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  const keys = [row.photo_key, `cards/${row.id}/index.html`];
  if (row.social_key) keys.push(row.social_key);
  await env.CARDS.delete(keys);
  await env.DB.prepare("DELETE FROM cards WHERE id = ?").bind(row.id).run();
  await purgeCardCache(input.origin, row.slug);
}

export async function getPublicCardById(env: Env, id: string, origin: string): Promise<PublicCard> {
  const row = await getCardRowById(env, id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  return toPublicCard(row, origin);
}

export async function unlockCard(
  env: Env,
  slug: string,
  password: string,
  origin: string,
): Promise<PublicCard & { editToken: string }> {
  const row = await getCardRowBySlug(env, slug);
  if (!row || !(await passwordMatches(password, row.password_hash, row.password_salt))) {
    throw new HttpError(401, "URL ou senha incorretos.");
  }
  const editToken = randomToken();
  const tokenHash = await sha256(editToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM editor_sessions WHERE expires_at <= ?").bind(now.toISOString()),
    env.DB.prepare(
      "INSERT INTO editor_sessions (token_hash, card_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    ).bind(tokenHash, row.id, expiresAt, now.toISOString()),
  ]);
  return { ...toPublicCard(row, origin), editToken };
}

export async function getCardHtmlBySlug(
  env: Env,
  slug: string,
): Promise<{ row: StoredCard; object: R2ObjectBody } | null> {
  const row = await getCardRowBySlug(env, slug);
  if (!row) return null;
  const object = await env.CARDS.get(`cards/${row.id}/index.html`);
  if (!object) return null;
  return { row: toStoredCard(row), object };
}

export async function getMedia(
  env: Env,
  id: string,
  kind: "photo" | "social",
): Promise<R2ObjectBody | null> {
  const row = await getCardRowById(env, id);
  if (!row) return null;
  const key = kind === "social" ? row.social_key : row.photo_key;
  return key ? env.CARDS.get(key) : null;
}

export async function listCards(env: Env, origin: string): Promise<PublicCard[]> {
  const result = await env.DB.prepare("SELECT * FROM cards ORDER BY updated_at DESC LIMIT 50").all<CardRow>();
  return result.results.map((row) => toPublicCard(row, origin));
}

export async function refreshCardHtml(env: Env, origin: string): Promise<{ refreshed: number }> {
  const result = await env.DB.prepare("SELECT * FROM cards ORDER BY updated_at DESC LIMIT 500").all<CardRow>();
  for (const row of result.results) {
    await writeCardHtml(env, row, origin);
    await purgeCardCache(origin, row.slug);
  }
  return { refreshed: result.results.length };
}

export function resolveOrigin(request: Request, env: Env): string {
  return env.PUBLIC_ORIGIN.trim().replace(/\/$/, "") || new URL(request.url).origin;
}

function toStoredCard(row: CardRow): StoredCard {
  return {
    id: row.id,
    slug: row.slug,
    manifest: CardManifestSchema.parse(JSON.parse(row.manifest_json)),
    photoKey: row.photo_key,
    socialKey: row.social_key,
    revisionCount: row.revision_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublicCard(row: CardRow, origin: string): PublicCard {
  const stored = toStoredCard(row);
  const photoUrl = `${origin}/media/${row.id}/photo`;
  return {
    ...stored,
    url: `${origin}/${row.slug}`,
    photoUrl,
    socialImageUrl: row.social_key
      ? `${origin}/media/${row.id}/social?v=${encodeURIComponent(row.updated_at)}`
      : photoUrl,
  };
}

async function writeCardHtml(env: Env, row: CardRow, origin: string): Promise<void> {
  const card = toPublicCard(row, origin);
  const html = renderCardDocument(card.manifest, {
    photoUrl: card.photoUrl,
    socialImageUrl: card.socialImageUrl,
    canonicalUrl: card.url,
    productUrl: origin,
  });
  await env.CARDS.put(`cards/${row.id}/index.html`, html, {
    httpMetadata: {
      contentType: "text/html; charset=UTF-8",
      cacheControl: "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
    customMetadata: { cardId: row.id, kind: "html", slug: row.slug },
  });
}

async function allocateSlug(env: Env, title: string, id: string): Promise<string> {
  const base = slugify(title);
  const candidates = [base, `${base}-${id.slice(0, 4)}`, `${base}-${id.slice(0, 8)}`];
  for (const candidate of candidates) {
    const existing = await env.DB.prepare("SELECT id FROM cards WHERE slug = ?").bind(candidate).first();
    if (!existing) return candidate;
  }
  return `${base}-${randomToken(4).toLowerCase()}`;
}

async function getCardRowById(env: Env, id: string): Promise<CardRow | null> {
  return env.DB.prepare("SELECT * FROM cards WHERE id = ?").bind(id).first<CardRow>();
}

async function getCardRowBySlug(env: Env, slug: string): Promise<CardRow | null> {
  return env.DB.prepare(
    `SELECT cards.*
     FROM cards
     LEFT JOIN card_slug_aliases ON card_slug_aliases.card_id = cards.id
     WHERE cards.slug = ? OR card_slug_aliases.slug = ?
     LIMIT 1`,
  )
    .bind(slug, slug)
    .first<CardRow>();
}

async function requireEditableCard(env: Env, id: string, editToken: string): Promise<CardRow> {
  const row = await getCardRowById(env, id);
  if (!row) throw new HttpError(404, "Cartão não encontrado.");
  if (!(await canEditCard(env, row, editToken))) {
    throw new HttpError(401, "Chave de edição inválida.");
  }
  return row;
}

async function canEditCard(env: Env, row: CardRow, editToken: string | null): Promise<boolean> {
  if (!editToken) return false;
  if (await tokenMatches(editToken, row.edit_token_hash)) return true;
  const tokenHash = await sha256(editToken);
  const session = await env.DB.prepare(
    "SELECT 1 AS allowed FROM editor_sessions WHERE token_hash = ? AND card_id = ? AND expires_at > ?",
  )
    .bind(tokenHash, row.id, new Date().toISOString())
    .first<{ allowed: number }>();
  return session?.allowed === 1;
}

async function purgeCardCache(origin: string, slug: string): Promise<void> {
  const cache = await caches.open("holocard");
  await cache.delete(new Request(`${origin}/${slug}`));
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}
