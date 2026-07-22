import { Hono } from "hono";
import { requireMcpAuth } from "./auth";
import {
  consumeCreateLimit,
  consumeUnlockLimit,
  createCard,
  deleteCard,
  getCardHtmlBySlug,
  getMedia,
  getPublicCardById,
  HttpError,
  resolveOrigin,
  reviseCard,
  setSocialImage,
  unlockCard,
  updateCardManifest,
  updateCardPassword,
  updateCardSlug,
} from "./cards";
import { handleMcp } from "./mcp";
import { requestCountry, track, visitorHash } from "./track";

const app = new Hono<{ Bindings: Env }>();

app.use("/mcp", requireMcpAuth);
app.use("/mcp/*", requireMcpAuth);

app.get("/api/health", (context) =>
  context.json({
    ok: true,
    name: "holocard",
    createModel: context.env.CREATE_MODEL,
    revisionModel: context.env.REVISION_MODEL,
  }),
);

app.post("/api/cards", async (context) => {
  const form = await context.req.formData();
  const prompt = form.get("prompt");
  const photo = form.get("photo");
  const signature = form.get("signature");
  const password = form.get("password");
  if (typeof prompt !== "string" || prompt.trim().length < 8 || prompt.length > 800) {
    throw new HttpError(400, "A mensagem deve ter entre 8 e 800 caracteres.");
  }
  if (!(photo instanceof File)) throw new HttpError(400, "Escolha uma foto.");
  if (signature !== null && (typeof signature !== "string" || signature.length > 60)) {
    throw new HttpError(400, "A assinatura deve ter no máximo 60 caracteres.");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new HttpError(400, "A senha deve ter entre 8 e 128 caracteres.");
  }
  if (photo.size > 8 * 1024 * 1024) throw new HttpError(413, "A foto deve ter no máximo 8 MB.");
  const bytes = await photo.arrayBuffer();
  const contentType = validateImage(bytes, photo.type);
  await consumeCreateLimit(context.env, context.req.raw);
  const card = await createCard(context.env, {
    prompt: prompt.trim(),
    signature: typeof signature === "string" ? signature.trim() : "",
    password,
    photo: bytes,
    contentType,
    origin: resolveOrigin(context.req.raw, context.env),
  });
  return noStoreJson({ card }, 201);
});

app.post("/api/cards/open", async (context) => {
  const body: { url?: unknown; password?: unknown } = await context.req
    .json<{ url?: unknown; password?: unknown }>()
    .catch(() => ({}));
  if (typeof body.url !== "string" || typeof body.password !== "string") {
    throw new HttpError(400, "Informe a URL e a senha do cartão.");
  }
  if (body.password.length < 8 || body.password.length > 128) {
    throw new HttpError(401, "URL ou senha incorretos.");
  }
  const slug = cardSlugFromUrl(body.url);
  await consumeUnlockLimit(context.env, context.req.raw, slug);
  const card = await unlockCard(
    context.env,
    slug,
    body.password,
    resolveOrigin(context.req.raw, context.env),
  );
  return noStoreJson({ card });
});

app.get("/api/cards/:id", async (context) => {
  const card = await getPublicCardById(
    context.env,
    context.req.param("id"),
    resolveOrigin(context.req.raw, context.env),
  );
  return noStoreJson({ card });
});

app.put("/api/cards/:id/social", async (context) => {
  const contentType = context.req.header("content-type")?.split(";")[0];
  if (contentType !== "image/jpeg") throw new HttpError(400, "A prévia deve ser JPEG.");
  const bytes = await context.req.arrayBuffer();
  if (bytes.byteLength > 2 * 1024 * 1024) {
    throw new HttpError(413, "A prévia deve ter no máximo 2 MB.");
  }
  validateImage(bytes, contentType);
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  const card = await setSocialImage(
    context.env,
    context.req.param("id"),
    editToken,
    bytes,
    resolveOrigin(context.req.raw, context.env),
  );
  return noStoreJson({ card });
});

app.put("/api/cards/:id/password", async (context) => {
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  const body: { password?: unknown } = await context.req
    .json<{ password?: unknown }>()
    .catch(() => ({}));
  if (typeof body.password !== "string") {
    throw new HttpError(400, "Informe a nova senha.");
  }
  await updateCardPassword(context.env, {
    id: context.req.param("id"),
    password: body.password,
    editToken,
  });
  return noStoreJson({ updated: true });
});

app.put("/api/cards/:id/slug", async (context) => {
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  const body: { slug?: unknown } = await context.req
    .json<{ slug?: unknown }>()
    .catch(() => ({}));
  if (typeof body.slug !== "string" || !body.slug.trim() || body.slug.length > 100) {
    throw new HttpError(400, "Escolha uma URL com até 100 caracteres.");
  }
  const card = await updateCardSlug(context.env, {
    id: context.req.param("id"),
    slug: body.slug,
    editToken,
    origin: resolveOrigin(context.req.raw, context.env),
  });
  return noStoreJson({ card });
});

app.put("/api/cards/:id", async (context) => {
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  const body: { manifest?: unknown } = await context.req
    .json<{ manifest?: unknown }>()
    .catch(() => ({}));
  const card = await updateCardManifest(context.env, {
    id: context.req.param("id"),
    manifest: body.manifest,
    editToken,
    origin: resolveOrigin(context.req.raw, context.env),
  });
  return noStoreJson({ card });
});

app.post("/api/cards/:id/revisions", async (context) => {
  const body: { prompt?: unknown } = await context.req
    .json<{ prompt?: unknown }>()
    .catch(() => ({}));
  if (typeof body.prompt !== "string" || body.prompt.trim().length < 4 || body.prompt.length > 400) {
    throw new HttpError(400, "A revisão deve ter entre 4 e 400 caracteres.");
  }
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  const card = await reviseCard(context.env, {
    id: context.req.param("id"),
    instruction: body.prompt.trim(),
    editToken,
    origin: resolveOrigin(context.req.raw, context.env),
  });
  return noStoreJson({ card });
});

app.delete("/api/cards/:id", async (context) => {
  const editToken = context.req.header("x-edit-token");
  if (!editToken) throw new HttpError(401, "Chave de edição ausente.");
  await deleteCard(context.env, {
    id: context.req.param("id"),
    editToken,
    origin: resolveOrigin(context.req.raw, context.env),
  });
  return noStoreJson({ deleted: true });
});

app.all("/mcp", (context) => handleMcp(context.req.raw, context.env));
app.all("/mcp/*", (context) => handleMcp(context.req.raw, context.env));

app.get("/media/:id/:kind", async (context) => {
  const kind = context.req.param("kind");
  if (kind !== "photo" && kind !== "social") return context.notFound();
  const object = await getMedia(context.env, context.req.param("id"), kind);
  if (!object) return context.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
});


// First-party analytics beacon for client-side events (see CLAUDE.md).
// Public by design; inputs validated and size-capped, writes fire-and-forget.
app.post("/e", async (context) => {
  let body: Record<string, unknown>;
  try {
    body = (await context.req.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ ok: false }, 400);
  }
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 64 || !/^[a-z0-9_.:-]+$/i.test(name)) {
    return noStoreJson({ ok: false, error: "invalid event name" }, 400);
  }
  const request = context.req.raw;
  context.executionCtx.waitUntil(
    (async () => {
      await track(context.env, name, {
        value: typeof body.value === "number" && Number.isFinite(body.value) ? body.value : 1,
        path: typeof body.path === "string" ? body.path.slice(0, 256) : undefined,
        dims:
          body.dims && typeof body.dims === "object"
            ? (body.dims as Record<string, string | number | boolean>)
            : undefined,
        visitor: await visitorHash(context.env, request),
        country: requestCountry(request),
      });
    })(),
  );
  return noStoreJson({ ok: true });
});

app.get("/:slug", async (context) => {
  const slug = context.req.param("slug");
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) return context.notFound();
  const request = context.req.raw;
  context.executionCtx.waitUntil(
    (async () => {
      await track(context.env, "pageview", {
        path: `/${slug}`,
        visitor: await visitorHash(context.env, request),
        country: requestCountry(request),
      });
    })(),
  );
  const cache = await caches.open("holocard");
  const cached = await cache.match(request);
  if (cached) return cached;

  const result = await getCardHtmlBySlug(context.env, slug);
  if (!result) return context.env.ASSETS.fetch(request);
  if (result.row.slug !== slug) {
    return Response.redirect(`${resolveOrigin(request, context.env)}/${result.row.slug}`, 301);
  }
  const headers = new Headers();
  result.object.writeHttpMetadata(headers);
  headers.set("etag", result.object.httpEtag);
  headers.set("cache-control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
  headers.set("content-security-policy", cardContentSecurityPolicy());
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  const response = new Response(result.object.body, { headers });
  context.executionCtx.waitUntil(cache.put(request, response.clone()));
  return response;
});

app.get("/", (context) => {
  const request = context.req.raw;
  context.executionCtx.waitUntil(
    (async () => {
      await track(context.env, "pageview", {
        path: "/",
        visitor: await visitorHash(context.env, request),
        country: requestCountry(request),
      });
    })(),
  );
  return context.env.ASSETS.fetch(request);
});

app.all("*", (context) => context.env.ASSETS.fetch(context.req.raw));

app.onError((error, context) => {
  if (error instanceof HttpError) return noStoreJson({ error: error.message }, error.status);
  console.error(
    JSON.stringify({
      event: "unhandled_error",
      path: context.req.path,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    }),
  );
  return noStoreJson({ error: "Não foi possível concluir agora. Tente novamente." }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    await env.DB.prepare("DELETE FROM events WHERE ts < ?").bind(cutoff).run();
  },
};

function noStoreJson(
  body: unknown,
  status: 200 | 201 | 400 | 401 | 404 | 409 | 413 | 429 | 500 = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function validateImage(
  bytes: ArrayBuffer,
  claimedType: string,
): "image/jpeg" | "image/png" | "image/webp" {
  const value = new Uint8Array(bytes.slice(0, 12));
  const jpeg = value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff;
  const png =
    value[0] === 0x89 &&
    value[1] === 0x50 &&
    value[2] === 0x4e &&
    value[3] === 0x47;
  const webp =
    String.fromCharCode(...value.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...value.slice(8, 12)) === "WEBP";
  const detected = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (!detected || (claimedType && claimedType !== detected)) {
    throw new HttpError(400, "A foto deve ser um JPG, PNG ou WebP válido.");
  }
  return detected;
}

function cardContentSecurityPolicy(): string {
  return [
    "default-src 'none'",
    "img-src 'self' data:",
    "manifest-src 'self'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
}

function cardSlugFromUrl(value: string): string {
  let pathname = value.trim();
  try {
    pathname = new URL(pathname).pathname;
  } catch {
    pathname = pathname.split(/[?#]/, 1)[0] ?? "";
  }
  const slug = pathname.replace(/^\/+|\/+$/g, "").split("/").at(-1) ?? "";
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
    throw new HttpError(401, "URL ou senha incorretos.");
  }
  return slug;
}
