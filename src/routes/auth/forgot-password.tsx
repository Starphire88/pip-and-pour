import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from "@/components/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Reset password" },
      { name: "description", content: "Request a password reset link for your Pip account." },
    ],
  }),
  component: ForgotPasswordPage,
});

/** Seconds the user must wait between reset requests. Supabase rate limits server side too. */
const COOLDOWN_SECONDS = 60;

/**
 * Turns a thrown Supabase error into something safe to display.
 * Provider strings can mention account existence or internal detail, so only the
 * shapes we can act on are mapped and everything else falls back to a neutral line.
 */
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("fetch failed")
  ) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many requests. Please wait a minute before trying again.";
  }
  return "Something went wrong sending the link. Please try again.";
}

function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Countdown for the request cooldown, so a user cannot hammer the endpoint.
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  // Prefill when someone lands here from a signed-in screen.
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || cooldown > 0) return;

    setError(null);
    setSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        const lower = resetError.message.toLowerCase();
        // A hidden-account response is still a success from the user's point of view.
        if (lower.includes("rate limit") || lower.includes("too many")) {
          setError(friendlyError(resetError));
          return;
        }
        setError(friendlyError(resetError));
        return;
      }

      setSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (thrown) {
      setError(friendlyError(thrown));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email address on your account and we'll send you a link to set a new password."
      footer={
        <>
          Remembered it? <AuthLink to="/auth/login">Log in</AuthLink>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <AuthNotice tone="success">
            If an account exists for {email.trim()}, a reset link is on its way. The link can only be used once and
            expires in 1 hour.
          </AuthNotice>
          <p className="text-[13px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            Nothing after a few minutes? Check your spam folder, then try again below.
          </p>
          <AuthSubmit
            type="button"
            onClick={() => setSent(false)}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
          </AuthSubmit>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={submitting}
          />

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          <AuthSubmit disabled={submitting || cooldown > 0 || !email.trim()}>
            {submitting ? "Sending…" : cooldown > 0 ? `Send again in ${cooldown}s` : "Send reset link"}
          </AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}
