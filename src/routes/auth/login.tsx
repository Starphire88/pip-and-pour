import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthField, AuthLink, AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Log in" },
      { name: "description", content: "Log in to track your hydration with Pip." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate({ to: "/", replace: true });
  };

  if (loading || user) return null;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep Pip hydrated and your streak alive."
      footer={
        <>
          No account? <AuthLink to="/auth/signup">Sign up</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <AuthField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
        />

        {error && (
          <p className="text-[13px] text-[#C44]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="mt-2 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition disabled:opacity-50"
          style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
