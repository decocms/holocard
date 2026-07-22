import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Second Vite build: the MCP-App UI. One self-contained HTML (CSS + JS
// inlined) that the Worker imports as text (wrangler.jsonc rules) and serves
// from every ui://holocard/* resource. deco studio renders it in a sandboxed
// iframe; the app picks its view at runtime from hostContext.toolInfo.
// The main SPA build (vite.config.ts) is untouched.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: "mcp-app",
  build: {
    outDir: path.resolve(__dirname, "dist-mcp"),
    emptyOutDir: true,
  },
});
