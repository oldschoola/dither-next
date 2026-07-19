import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

// Mirrors the Vue tree's vitest.config.ts but targets the Next.js port:
// jsdom environment for the component specs, the same @ + @dither-kit aliases
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@dither-kit": fileURLToPath(new URL("./dither-kit/index.ts", import.meta.url)),
    },
  },
  esbuild: {
    // React 19 automatic JSX runtime — the tsconfig uses "jsx": "preserve"
    // for Next.js, but vitest's esbuild must compile JSX itself. "automatic"
    // injects the jsx-runtime import so `.tsx` specs don't need `import React`.
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    setupFiles: ["tests/setup.ts"],
    css: {
      modules: { classNameStrategy: "non-scoped" },
    },
  },
})
