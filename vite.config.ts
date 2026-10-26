import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key && !key.startsWith("sb_publishable_"))
    throw new Error(
      "Only modern sb_publishable_ keys may be included in a browser build.",
    );
  return {
    base: process.env.VITE_BASE_PATH || env.VITE_BASE_PATH || "/",
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/@supabase")) return "supabase";
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/scheduler")
            )
              return "react-vendor";
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "Our Travel Stories",
          short_name: "Our Stories",
          description: "Perjalanan dan kenangan Rheno & Fadla",
          lang: "id",
          theme_color: "#faf3ef",
          background_color: "#faf3ef",
          display: "standalone",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icon-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/\/auth\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
