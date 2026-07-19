import { extname, resolve } from "node:path";
import { parseManifest, renderCardDocument } from "../src/core/card";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const manifestPath = argument("manifest");
const imagePath = argument("image");
const outputPath = argument("output") ?? "holocard.html";

if (!manifestPath || !imagePath) {
  console.error(
    "Usage: bun run card:generate -- --manifest card.json --image photo.jpg [--output holocard.html]",
  );
  process.exit(1);
}

const manifestFile = Bun.file(resolve(manifestPath));
const imageFile = Bun.file(resolve(imagePath));

if (!(await manifestFile.exists())) throw new Error(`Manifest not found: ${manifestPath}`);
if (!(await imageFile.exists())) throw new Error(`Image not found: ${imagePath}`);
if (imageFile.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller");

const manifest = parseManifest(await manifestFile.json());
const extension = extname(imagePath).toLowerCase();
const mime =
  extension === ".png"
    ? "image/png"
    : extension === ".webp"
      ? "image/webp"
      : "image/jpeg";
const base64 = Buffer.from(await imageFile.arrayBuffer()).toString("base64");
const photoUrl = `data:${mime};base64,${base64}`;
const html = renderCardDocument(manifest, { photoUrl });

await Bun.write(resolve(outputPath), html);
console.log(`Created ${resolve(outputPath)}`);
