import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: "./",
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: true,
    rollupOptions: {
      input: path.join(__dirname, "index.html")
    }
  },
  resolve: {
    alias: {
      "@ai-pm/core": path.join(__dirname, "../core/src"),
      "@ai-pm/agents": path.join(__dirname, "../agents/src"),
      "@ai-pm/mcp": path.join(__dirname, "../mcp/src"),
      "@ai-pm/shared": path.join(__dirname, "../shared/src"),
      "@": path.join(__dirname, "src")
    }
  },
  server: {
    port: 8080,
    strictPort: true
  }
});
