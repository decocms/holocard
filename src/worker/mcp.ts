import { cardManifestJsonSchema } from "@/core/types";
import {
  createCard,
  deleteCard,
  getPublicCardById,
  listCards,
  refreshCardHtml,
  resolveOrigin,
  reviseCard,
  setSocialImage,
  updateCardManifest,
  updateCardPassword,
  updateCardSlug,
} from "./cards";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (env: Env, request: Request, input: Record<string, unknown>) => Promise<unknown>;
}

const tools: ToolDefinition[] = [
  {
    name: "create_card",
    description:
      "Create and publish a personalized holographic card from an HTTPS image URL and a rough message.",
    inputSchema: objectSchema(
      {
        imageUrl: { type: "string", description: "Public HTTPS URL for a JPG, PNG, or WebP image." },
        prompt: {
          type: "string",
          minLength: 8,
          maxLength: 800,
          description: "Occasion, recipient context, and desired message.",
        },
        signature: {
          type: "string",
          maxLength: 60,
          description: "Optional text shown at the bottom, such as 'Com carinho, Ju'.",
        },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 128,
          description: "Password used to reopen the card editor later.",
        },
      },
      ["imageUrl", "prompt", "password"],
    ),
    async execute(env, request, input) {
      const imageUrl = requiredString(input.imageUrl, "imageUrl", 2_000);
      const prompt = requiredString(input.prompt, "prompt", 800);
      const signature =
        typeof input.signature === "string" ? input.signature.trim().slice(0, 60) : "";
      const password = requiredPassword(input.password);
      const image = await downloadImage(imageUrl);
      return createCard(env, {
        prompt,
        signature,
        password,
        photo: image.bytes,
        contentType: image.contentType,
        origin: resolveOrigin(request, env),
      });
    },
  },
  {
    name: "revise_card",
    description: "Revise a published card. Each card allows at most two revisions.",
    inputSchema: objectSchema(
      {
        id: { type: "string", description: "Card ID returned by create_card or list_cards." },
        instruction: {
          type: "string",
          minLength: 4,
          maxLength: 400,
          description: "What to change while preserving the known personal facts.",
        },
      },
      ["id", "instruction"],
    ),
    execute: (env, request, input) =>
      reviseCard(env, {
        id: requiredString(input.id, "id", 64),
        instruction: requiredString(input.instruction, "instruction", 400),
        origin: resolveOrigin(request, env),
        ownerOverride: true,
      }),
  },
  {
    name: "update_card",
    description: "Save direct text and design edits without consuming an AI revision.",
    inputSchema: objectSchema(
      {
        id: { type: "string" },
        manifest: cardManifestJsonSchema,
      },
      ["id", "manifest"],
    ),
    execute: (env, request, input) =>
      updateCardManifest(env, {
        id: requiredString(input.id, "id", 64),
        manifest: input.manifest,
        origin: resolveOrigin(request, env),
        ownerOverride: true,
      }),
  },
  {
    name: "set_social_image",
    description: "Replace a card's 1200x630 social preview JPEG without its edit token.",
    inputSchema: objectSchema(
      {
        id: { type: "string" },
        base64Jpeg: {
          type: "string",
          description: "Base64-encoded JPEG bytes, without a data URL prefix.",
        },
      },
      ["id", "base64Jpeg"],
    ),
    execute: (env, request, input) =>
      setSocialImage(
        env,
        requiredString(input.id, "id", 64),
        "",
        decodeBase64Jpeg(requiredString(input.base64Jpeg, "base64Jpeg", 3_000_000)),
        resolveOrigin(request, env),
        true,
      ),
  },
  {
    name: "set_card_password",
    description: "Set or replace the recovery password for an existing card.",
    inputSchema: objectSchema(
      {
        id: { type: "string" },
        password: { type: "string", minLength: 8, maxLength: 128 },
      },
      ["id", "password"],
    ),
    async execute(env, _request, input) {
      const id = requiredString(input.id, "id", 64);
      await updateCardPassword(env, {
        id,
        password: requiredPassword(input.password),
        ownerOverride: true,
      });
      return { updated: true, id };
    },
  },
  {
    name: "update_card_slug",
    description: "Change a card's public URL while preserving the previous URL as a redirect.",
    inputSchema: objectSchema(
      {
        id: { type: "string" },
        slug: { type: "string", minLength: 1, maxLength: 100 },
      },
      ["id", "slug"],
    ),
    execute: (env, request, input) =>
      updateCardSlug(env, {
        id: requiredString(input.id, "id", 64),
        slug: requiredString(input.slug, "slug", 100),
        origin: resolveOrigin(request, env),
        ownerOverride: true,
      }),
  },
  {
    name: "get_card",
    description: "Get a published card, its manifest, share URL, and revision count.",
    inputSchema: objectSchema({ id: { type: "string" } }, ["id"]),
    execute: (env, request, input) =>
      getPublicCardById(env, requiredString(input.id, "id", 64), resolveOrigin(request, env)),
  },
  {
    name: "list_cards",
    description: "List the 50 most recently updated cards.",
    inputSchema: objectSchema({}, []),
    execute: (env, request) => listCards(env, resolveOrigin(request, env)),
  },
  {
    name: "refresh_card_html",
    description: "Rebuild every stored card with the current HTML template without consuming a revision.",
    inputSchema: objectSchema({}, []),
    execute: (env, request) => refreshCardHtml(env, resolveOrigin(request, env)),
  },
  {
    name: "delete_card",
    description: "Permanently delete a card, its photo, social image, and HTML.",
    inputSchema: objectSchema({ id: { type: "string" } }, ["id"]),
    async execute(env, request, input) {
      const id = requiredString(input.id, "id", 64);
      await deleteCard(env, {
        id,
        origin: resolveOrigin(request, env),
        ownerOverride: true,
      });
      return { deleted: true, id };
    },
  },
];

const toolByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method === "GET") {
    return Response.json({
      name: "holocard",
      version: "0.1.0",
      transport: "JSON-RPC 2.0 over HTTP",
      endpoint: "/mcp",
    });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    return Response.json(rpcError(null, -32600, "Invalid Request"), { status: 400 });
  }
  if (body.id === undefined) return new Response(null, { status: 202 });

  const id = body.id ?? null;
  try {
    const result = await dispatch(env, request, body.method, body.params ?? {});
    return Response.json({ jsonrpc: "2.0", id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(rpcError(id, -32603, message));
  }
}

async function dispatch(
  env: Env,
  request: Request,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "holocard", version: "0.1.0" },
        instructions:
          "Crie cartões com create_card, mostre a URL final e lembre que há no máximo duas revisões. Confirme antes de delete_card.",
      };
    case "ping":
      return {};
    case "tools/list":
      return {
        tools: tools.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      };
    case "tools/call": {
      const name = requiredString(params.name, "tool name", 80);
      const tool = toolByName[name];
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      const input =
        params.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, unknown>)
          : {};
      const output = await tool.execute(env, request, input);
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
        isError: false,
      };
    }
    case "resources/list":
      return { resources: [] };
    case "prompts/list":
      return { prompts: [] };
    default:
      throw new Error(`Method not found: ${method}`);
  }
}

function objectSchema(properties: Record<string, unknown>, required: string[]) {
  return { type: "object", properties, required, additionalProperties: false };
}

function requiredString(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${name}`);
  if (value.length > maxLength) throw new Error(`${name} is too long`);
  return value.trim();
}

function requiredPassword(value: unknown): string {
  const password = requiredString(value, "password", 128);
  if (password.length < 8) throw new Error("password must have at least 8 characters");
  return password;
}

async function downloadImage(urlValue: string): Promise<{
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
}> {
  const url = new URL(urlValue);
  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) {
    throw new Error("imageUrl must be a public HTTPS URL");
  }
  const response = await fetch(url, {
    headers: { accept: "image/jpeg,image/png,image/webp" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) throw new Error(`Could not download image (${response.status})`);
  const contentType = response.headers.get("content-type")?.split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType ?? "")) {
    throw new Error("imageUrl must return JPG, PNG, or WebP");
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller");
  const bytes = await readBounded(response.body, 8 * 1024 * 1024);
  return {
    bytes,
    contentType: contentType as "image/jpeg" | "image/png" | "image/webp",
  };
}

async function readBounded(stream: ReadableStream<Uint8Array>, limit: number): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Image must be 8 MB or smaller");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output.buffer;
}

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower === "::1") return true;
  const parts = lower.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function rpcError(id: number | string | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function decodeBase64Jpeg(value: string): ArrayBuffer {
  const binary = atob(value);
  if (binary.length > 2 * 1024 * 1024) throw new Error("Social preview must be 2 MB or smaller");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error("Social preview must be a JPEG");
  }
  return bytes.buffer;
}
