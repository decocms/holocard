import { describe, expect, test } from "bun:test";
import {
  hashPassword,
  passwordMatches,
  randomToken,
  sha256,
  timingSafeEqual,
  tokenMatches,
} from "../src/worker/auth";

describe("tokens", () => {
  test("creates URL-safe random tokens", () => {
    const token = randomToken();
    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("verifies stored token hashes", async () => {
    const hash = await sha256("correct");
    expect(await tokenMatches("correct", hash)).toBe(true);
    expect(await tokenMatches("wrong", hash)).toBe(false);
  });

  test("compares unequal lengths without accepting a prefix", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });

  test("hashes passwords with unique salts", async () => {
    const first = await hashPassword("uma-senha-segura");
    const second = await hashPassword("uma-senha-segura");
    expect(first.hash).not.toBe(second.hash);
    expect(await passwordMatches("uma-senha-segura", first.hash, first.salt)).toBe(true);
    expect(await passwordMatches("senha-errada", first.hash, first.salt)).toBe(false);
  });
});
