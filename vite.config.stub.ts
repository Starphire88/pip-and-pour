// TEMPORARY test-only build config. Points the app at the local stub auth server
// so the reset-password flow can be exercised while the real Supabase project is
// unreachable. Not part of the app; deleted after verification.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    output: {
      dir: ".output-stub",
    },
  },
});
