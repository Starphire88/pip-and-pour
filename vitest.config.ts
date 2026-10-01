import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Standalone test config. Deliberately does NOT load vite.config.ts: that file pulls in the
 * TanStack Start / Nitro build pipeline, which is unnecessary and slow for pure logic tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    reporters: ["default"],
  },
});
