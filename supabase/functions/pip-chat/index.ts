import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Browsers send an OPTIONS preflight first — allow it without auth
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verify JWT and get the authenticated user ──
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

    // ── 2. Authorise — caller must own a Pip account row ──
    //    A valid JWT proves who you are, but it doesn't prove you
    //    set up Pip.  We check the streaks table; user_settings is
    //    another option.  No row → 403 (not your water to drink).
    const { data: streak, error: streakError } = await supabaseClient
      .from("streaks")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakError || !streak) {
      console.warn(
        `pip-chat: user ${user.id} has no streaks row — forbidden`,
      );
      return new Response(
        JSON.stringify({ error: "Forbidden — no Pip account found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Parse the request ──
    const { percentMet, streakDays, mood } = await req.json();

    // ── 4. Build Pip's personality prompt ──
    const systemPrompt = `You are Pip, a sassy, dramatic giant panda who tracks the user's water intake.
Current stats: the user has drunk ${percentMet}% of their daily goal, their streak is ${streakDays} days, and their current mood state is "${mood}".
Stay in character: theatrical, a little passive-aggressive when hydration is low, warmer when goals are met. Keep your reply to one or two short sentences — this appears in a speech bubble.`;

    // ── 5. Call Claude ──
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: systemPrompt,
      messages: [
        { role: "user", content: "Give Pip's reaction to the current stats." },
      ],
    });

    const pipLine = message.content[0].text;

    return new Response(JSON.stringify({ pipLine }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pip-chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
