// Attach security headers to the Vercel deployment by editing .vercel/output/config.json
// after the build.
//
// Why a postbuild step instead of nitro routeRules in vite.config.ts: the Lovable
// defineConfig wrapper silently drops unknown nitro keys, so routeRules never reached
// the generated config.
//
// Why routes and not a top-level "headers" key: the Build Output API's config.json has no
// headers property at all (type Config = { version; routes?; images?; wildcard?;
// overrides?; cache?; framework?; crons?; services? }). Vercel silently discards unknown
// keys, so headers have to be attached to a Route Source with continue: true.
//
// Idempotent: strips any rules it previously added, then re-adds them. No-op if the
// build output is missing.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CONFIG = resolve(process.cwd(), ".vercel/output/config.json");

if (!existsSync(CONFIG)) {
  console.log("[headers] .vercel/output/config.json not found; nothing to do");
  process.exit(0);
}

const envText = existsSync(resolve(process.cwd(), ".env"))
  ? readFileSync(resolve(process.cwd(), ".env"), "utf8")
  : "";
const supabaseUrl = (
  process.env.VITE_SUPABASE_URL ||
  envText.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1] ||
  ""
)
  .trim()
  .replace(/\/$/, "");
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

/**
 * 'unsafe-inline' is required in script-src because TanStack Start streams inline
 * hydration scripts; removing it breaks the app rather than hardening it. Everything
 * else is locked to self plus the two origins the app genuinely talks to.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://fonts.gstatic.com",
  ["connect-src", "'self'", supabaseUrl, supabaseWs].filter(Boolean).join(" "),
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const addedRoutes = [
  {
    // A cached service worker cannot be replaced, so never let the edge hold one.
    src: "/sw\\.js",
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
    continue: true,
  },
  {
    src: "/(.*)",
    headers: {
      "Content-Security-Policy": csp,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
    },
    continue: true,
  },
];

const config = JSON.parse(readFileSync(CONFIG, "utf8"));

// Drop anything a previous run of this script added, and the top-level headers key that
// the Build Output API does not accept.
delete config.headers;
config.routes = (config.routes || []).filter(
  (route) =>
    !(
      route &&
      route.headers &&
      ("Content-Security-Policy" in route.headers || "Service-Worker-Allowed" in route.headers)
    ),
);

config.routes.unshift(...addedRoutes);
writeFileSync(CONFIG, JSON.stringify(config, null, 2));

console.log(
  `[headers] prepended ${addedRoutes.length} header routes into .vercel/output/config.json ` +
    `(connect-src includes ${supabaseUrl || "no Supabase origin found"})`,
);
