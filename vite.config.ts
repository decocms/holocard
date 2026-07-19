import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 4001,
    strictPort: true,
    host: true,
    allowedHosts: [".decocms.com", "localhost"],
    proxy: {
      "/api": "http://localhost:8789",
      "/mcp": "http://localhost:8789",
      "/media": "http://localhost:8789",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
