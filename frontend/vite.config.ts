
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePluginRadar } from "vite-plugin-radar";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePluginRadar({
      gtm: [
        {
          id: process.env.VITE_GTM_ID || "",
        },
      ],
    }),
  ],
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
