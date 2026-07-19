import { z } from "zod";

export const CARD_TEMPLATES = ["aurora", "confetti", "keepsake"] as const;
export const CARD_ACCENTS = ["rose", "aqua", "sun", "violet", "mint", "custom"] as const;
export const CARD_FRAMES = ["silver", "gold", "prism", "ink", "copper", "pearl"] as const;
export const CARD_PATTERNS = ["none", "rays", "grid", "sparkles", "waves", "stars"] as const;

export const CardManifestSchema = z.object({
  version: z.literal(1).default(1),
  locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default("pt-BR"),
  template: z.enum(CARD_TEMPLATES).default("aurora"),
  accent: z.enum(CARD_ACCENTS).default("rose"),
  customColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e72e83"),
  frame: z.enum(CARD_FRAMES).default("silver"),
  pattern: z.enum(CARD_PATTERNS).default("none"),
  title: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(320),
  signature: z.string().trim().max(60).default(""),
  occasion: z.string().trim().min(1).max(40),
  photoHeight: z.number().int().min(42).max(68).default(56),
  photoPositionX: z.number().int().min(0).max(100).default(50),
  photoPositionY: z.number().int().min(0).max(100).default(50),
});

export type CardManifest = z.infer<typeof CardManifestSchema>;

export const cardManifestJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "number", enum: [1] },
    locale: { type: "string", pattern: "^[a-z]{2,3}(?:-[A-Z]{2})?$" },
    template: { type: "string", enum: [...CARD_TEMPLATES] },
    accent: { type: "string", enum: [...CARD_ACCENTS] },
    customColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    frame: { type: "string", enum: [...CARD_FRAMES] },
    pattern: { type: "string", enum: [...CARD_PATTERNS] },
    title: { type: "string", minLength: 1, maxLength: 60 },
    message: { type: "string", minLength: 1, maxLength: 320 },
    signature: { type: "string", maxLength: 60 },
    occasion: { type: "string", minLength: 1, maxLength: 40 },
    photoHeight: { type: "integer", minimum: 42, maximum: 68 },
    photoPositionX: { type: "integer", minimum: 0, maximum: 100 },
    photoPositionY: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "version",
    "locale",
    "template",
    "accent",
    "customColor",
    "frame",
    "pattern",
    "title",
    "message",
    "signature",
    "occasion",
    "photoHeight",
    "photoPositionX",
    "photoPositionY",
  ],
} as const;

export interface StoredCard {
  id: string;
  slug: string;
  manifest: CardManifest;
  photoKey: string;
  socialKey: string | null;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCard extends StoredCard {
  url: string;
  photoUrl: string;
  socialImageUrl: string;
}
