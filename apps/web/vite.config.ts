import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  server: {
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ["@workspace/shared", "@workspace/ui"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
