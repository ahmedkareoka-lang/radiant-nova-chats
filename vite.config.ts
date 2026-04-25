import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // 📊 Bundle size analyzer (output: dist/stats.html)
    mode === "production" &&
      visualizer({
        open: false,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  build: {
    // 🚀 Production-grade output: smaller, faster, cleaner
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Smart chunking: keep heavy libs in their own bundles so they cache forever
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "supabase-vendor": ["@supabase/supabase-js"],
          "query-vendor": ["@tanstack/react-query", "@tanstack/query-core"],
          "motion-vendor": ["framer-motion"],
          "agora-vendor": ["agora-rtc-sdk-ng"],
          "lottie-vendor": ["lottie-react"],
        },
        // 🗜️ Organize assets into folders by type for cleaner dist/
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          const ext = name.split(".").pop()?.toLowerCase() ?? "";
          if (/^(png|jpe?g|svg|gif|webp|avif|ico)$/.test(ext)) {
            return "assets/images/[name]-[hash][extname]";
          }
          if (/^(woff2?|ttf|otf|eot)$/.test(ext)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          if (ext === "css") {
            return "assets/css/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
  },
  // ⚡ Pre-bundle hot dependencies for faster cold start
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "@tanstack/react-query",
    ],
    esbuildOptions: {
      target: "es2020",
    },
  },
  esbuild: {
    // 🧹 Strip all console.* and debugger statements in production builds
    drop: mode === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
}));
