import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Provider: Google Generative Language API (the user's Antigravity account key).
// Replaces the previous Anthropic call, which failed with no credit.
// Verified 2026-10-01: gemini-2.5-flash returns a full in-character line in ~1s with
// thinking disabled. The 3.x flash models push 300+ thinking tokens through the output
// budget, truncating the speech bubble to one word, so thinking is explicitly off.
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

// Per-instance throttle. Warm instances share this map, which blunts a burst from a single
// account. It is not a substitute for a database-backed counter, but this endpoint calls a
// paid API and previously had no limit of any kind.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 6;
const recentCalls = new Map<string, number[]>();

function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter(
    (at) => now - at < RATE_LIMIT_WINDOW_MS,
  );
  if (calls.length >= RATE_LIMIT_MAX) {
    recentCalls.set(userId, calls);
    return false;
  }
  calls.push(now);
  recentCalls.set(userId, calls);
  if (recentCalls.size > 500) {
    for (const [key, times] of recentCalls) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) recentCalls.delete(key);
    }
  }
  return true;
}

type GeminiPart = { text?: string; thought?: boolean };

function extractText(body: unknown): string {
  const candidates = (body as { candidates?: Array<Record<string, unknown>> }).candidates;
  const parts = (candidates?.[0]?.content as { parts?: GeminiPart[] } | undefined)?.parts;
  if (!Array.isArray(parts)) return "";
  // Thought parts must not reach the speech bubble; they are internal reasoning.
  return parts
    .filter((p) => p.thought !== true && typeof p.text === "string")
    .map((p) => p.text!.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildPayload(
  systemPrompt: string,
  userTurn: string,
  inlineSystem: boolean,
): Record<string, unknown> {
  // Some models (e.g. antigravity-preview-latest) reject systemInstruction with
  // 400 "Developer instruction is not enabled"; those need the persona inlined instead.
  const payload: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [{ text: inlineSystem ? `${systemPrompt}\n\n${userTurn}` : userTurn }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.9,
      // Thinking tokens are billed against maxOutputTokens on 2.5+/3.x. Left on, the
      // bubble gets truncated mid-sentence; the persona needs no deliberation.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (!inlineSystem) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userTurn: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  let inlineSystem = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(systemPrompt, userTurn, inlineSystem)),
    });

    if (res.ok) {
      const body = await res.json();
      const text = extractText(body);
      if (!text) {
        return { ok: false, status: 502, detail: "Gemini returned no text part" };
      }
      return { ok: true, text };
    }

    const detail = await res.text();
    // One retry only, and only for the specific "no developer instruction" rejection.
    if (!inlineSystem && res.status === 400 && /developer instruction/i.test(detail)) {
      inlineSystem = true;
      continue;
    }
    return { ok: false, status: res.status, detail };
  }

  return { ok: false, status: 502, detail: "Gemini call exhausted retries" };
}

serve(async (req) => {
  // Browsers send an OPTIONS preflight first, allow it without auth
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT and get the authenticated user
    //    supabase.functions.invoke() on the client auto-attaches the
    //    session token, but ANYONE with the anon key can hit this URL
    //    directly.  If verify_jwt is true in config.toml the Supabase
    //    gateway rejects unauthenticated calls before we even run.
    //    We also double-check here for defence-in-depth.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.warn("pip-chat: invalid JWT rejected");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Authorise: caller must own a Pip account row
    //    A valid JWT proves who you are, but it doesn't prove you
    //    set up Pip.  We check the streaks table; user_settings is
    //    another option.  No row -> 403 (not your water to drink).
    const { data: streak, error: streakError } = await supabaseClient
      .from("streaks")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakError || !streak) {
      console.warn(`pip-chat: user ${user.id} has no streaks row, forbidden`);
      return new Response(
        JSON.stringify({ error: "Forbidden: no Pip account found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2b. Throttle before spending money
    if (!withinRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Too many requests" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Parse the request
    const { percentMet, streakDays, mood } = await req.json();

    // 4. Build Pip's personality prompt
    const systemPrompt = `You are Pip, a sassy, dramatic giant panda who tracks the user's water intake.
Current stats: the user has drunk ${percentMet}% of their daily goal, their streak is ${streakDays} days, and their current mood state is "${mood}".
Stay in character: theatrical, a little passive-aggressive when hydration is low, warmer when goals are met. Keep your reply to one or two short sentences, this appears in a speech bubble.`;

    // 5. Call Gemini on the user's Antigravity key
    // Secret name is explicit about which account it belongs to: the local ~/.hermes/.env
    // GEMINI_API_KEY is a DIFFERENT credential (the Hermes stack's own key), so a bare
    // GEMINI_API_KEY on the project was ambiguous. GEMINI_API_KEY is still read as a fallback
    // so a half-applied rename cannot take chat down.
    const apiKey = Deno.env.get("ANTIGRAVITY_GEMINI_API_KEY") ??
      Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("ANTIGRAVITY_GEMINI_API_KEY is not set on this function");
    }
    const model = Deno.env.get("PIP_MODEL") ?? DEFAULT_MODEL;

    const result = await callGemini(
      apiKey,
      model,
      systemPrompt,
      "Give Pip's reaction to the current stats.",
    );

    if (!result.ok) {
      // Surface the upstream status in the thrown message so the catch block can classify
      // 429/5xx as degraded (503) rather than a hard 500, and keep the detail for the logs.
      throw new Error(`Gemini ${result.status}: ${result.detail.slice(0, 300)}`);
    }

    return new Response(JSON.stringify({ pipLine: result.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log the detail, hand the browser a generic message. This used to return
    // error.message verbatim, which passed the upstream provider error (including its
    // request id) straight through to the client.
    const detail = error instanceof Error ? error.message : String(error);
    console.error("pip-chat error:", detail);
    const upstreamUnavailable =
      /credit balance|insufficient|quota|rate.?limit|overloaded|api key|Gemini (429|5\d\d)/i
        .test(detail);
    return new Response(
      JSON.stringify({
        error: "Pip is speechless right now",
        degraded: true,
      }),
      {
        status: upstreamUnavailable ? 503 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
