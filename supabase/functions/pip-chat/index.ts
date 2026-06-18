import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

// These headers tell the browser "it's okay for any origin to call this function"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Browsers send an OPTIONS request first to check permissions.
  // We just need to say "yes, that's allowed" and stop here.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Pull the JSON data the app sent us out of the request body
    const { percentMet, streakDays, mood } = await req.json();

    // Build Pip's personality instructions, injecting the real current stats
    const systemPrompt = `You are Pip, a sassy, dramatic giant panda who tracks the user's water intake.
Current stats: the user has drunk ${percentMet}% of their daily goal, their streak is ${streakDays} days, and their current mood state is "${mood}".
Stay in character: theatrical, a little passive-aggressive when hydration is low, warmer when goals are met. Keep your reply to one or two short sentences — this appears in a speech bubble.`;

    // Create the Claude client, pulling the key from the secret we stored
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    // Ask Claude to generate Pip's line
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: systemPrompt,
      messages: [
        { role: "user", content: "Give Pip's reaction to the current stats." },
      ],
    });

    const pipLine = message.content[0].text;

    // Send Pip's line back to the app as JSON
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
