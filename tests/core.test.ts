import { describe, expect, test } from "bun:test";
import { parseManifest, renderCardDocument, renderCardMarkup, slugify } from "../src/core/card";
import type { CardManifest } from "../src/core/types";

const manifest: CardManifest = {
  version: 1,
  locale: "pt-BR",
  template: "aurora",
  accent: "rose",
  customColor: "#e72e83",
  frame: "silver",
  pattern: "none",
  title: "Feliz aniversário, Tally!",
  message: "Que o seu novo ano seja lindo.",
  signature: "Com carinho, Gui",
  occasion: "Hoje é dia de celebrar",
  photoHeight: 56,
  photoPositionX: 50,
  photoPositionY: 50,
};

describe("slugify", () => {
  test("creates readable Portuguese slugs", () => {
    expect(slugify("Parabéns, Júlia & Flávio!")).toBe("parabens-julia-flavio");
  });
});

describe("manifest validation", () => {
  test("rejects unknown templates", () => {
    expect(() => parseManifest({ ...manifest, template: "model-authored-html" })).toThrow();
  });

  test("rejects oversized messages", () => {
    expect(() => parseManifest({ ...manifest, message: "x".repeat(321) })).toThrow();
  });

  test("rejects invalid locale and photo proportions", () => {
    expect(() => parseManifest({ ...manifest, locale: "brasil" })).toThrow();
    expect(() => parseManifest({ ...manifest, photoHeight: 90 })).toThrow();
    expect(() => parseManifest({ ...manifest, photoPositionY: 120 })).toThrow();
    expect(() => parseManifest({ ...manifest, customColor: "pink" })).toThrow();
    expect(() => parseManifest({ ...manifest, frame: "plastic" })).toThrow();
    expect(() => parseManifest({ ...manifest, pattern: "pokemon" })).toThrow();
  });
});

describe("renderer", () => {
  test("escapes all user-authored fields", () => {
    const html = renderCardMarkup(
      {
        ...manifest,
        title: "<script>alert(1)</script>",
        message: `hello <img src=x onerror="alert(1)">`,
      },
      "https://example.com/photo.jpg",
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  test("renders complete SEO metadata and a fixed template", () => {
    const html = renderCardDocument(manifest, {
      photoUrl: "https://example.com/photo.jpg",
      socialImageUrl: "https://example.com/social.jpg",
      canonicalUrl: "https://example.com/feliz-aniversario-tally",
      productUrl: "https://example.com",
    });
    expect(html).toContain('<meta property="og:image" content="https://example.com/social.jpg"');
    expect(html).toContain('<link rel="canonical" href="https://example.com/feliz-aniversario-tally"');
    expect(html).toContain('<link rel="icon" href="https://example.com/favicon.svg"');
    expect(html).toContain('data-template="aurora"');
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain('class="holo-flip-toggle"');
    expect(html).toContain('class="holo-face holo-face--back"');
    expect(html).toContain('class="holo-back-logo"');
    expect(html).toContain('class="holo-chip" href="https://example.com"');
    expect(html).toContain('data-frame="silver"');
    expect(html).toContain('data-pattern="none"');
    expect(html).toContain('class="holo-reveal-button"');
    expect(html).toContain("Tem um cartão para você.");
    expect(html).toContain("Deslize para abrir");
    expect(html).toContain("finishRevealSwipe");
    expect(html).not.toContain('addEventListener("click", openPublishedCard');
    expect(html).toContain('class="holo-published-card" inert');
    expect(html).not.toContain('class="actions"');
  });
});
