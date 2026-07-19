import type { Context, Next } from "hono";

const PASSWORD_ITERATIONS = 100_000;

export function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function tokenMatches(received: string | null, expectedHash: string): Promise<boolean> {
  if (!received) return false;
  return timingSafeEqual(await sha256(received), expectedHash);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return {
    hash: await derivePasswordHash(password, salt),
    salt: base64Url(salt),
  };
}

export async function passwordMatches(
  password: string,
  expectedHash: string | null,
  encodedSalt: string | null,
): Promise<boolean> {
  if (!expectedHash || !encodedSalt) return false;
  const receivedHash = await derivePasswordHash(password, fromBase64Url(encodedSalt));
  return timingSafeEqual(receivedHash, expectedHash);
}

export function timingSafeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index++) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export async function requireMcpAuth(
  context: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  const expected = context.env.MCP_AUTH_TOKEN;
  if (!expected) {
    return context.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32002,
          message: "MCP_AUTH_TOKEN is not configured on this deployment.",
        },
      },
      503,
    );
  }

  const authorization = context.req.header("authorization");
  const received = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : context.req.header("x-mcp-auth")?.trim();

  if (!received || !timingSafeEqual(received, expected)) {
    return context.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Unauthorized. Send Authorization: Bearer <token>.",
        },
      },
      401,
    );
  }

  await next();
}

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new Uint8Array(salt).buffer,
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return base64Url(new Uint8Array(bits));
}
