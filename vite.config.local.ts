// Local build config: same as vite.config.ts but producing a plain Node server, so the app can be
// served from this Mac (Tailscale) without a Vercel deploy. The deployed config is untouched.
// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, componentTagger, VITE_* injection and the @ alias.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    output: {
      dir: ".output-node",
    },
  },
});
