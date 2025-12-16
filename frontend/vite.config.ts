import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.ttl"],
  server: {
    proxy: {
      "/api": {
        target: "https://ontomanager-720202460313.europe-west1.run.app",
        secure: false,
        changeOrigin: true,
      },
    },
  },
});
