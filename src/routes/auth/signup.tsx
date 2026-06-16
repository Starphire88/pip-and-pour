import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthField, AuthLink, AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Sign up" },
      { name: "description", content: "Create an account to track your hydration with Pip." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      navigate({ to: "/", replace: true });
      return;
    }

    setSuccess("Check your email to confirm your account, then log in.");
  };

  if (loading || user) return null;

  return (
    <AuthShell
      title="Join Pip"
      subtitle="Create an account and start your hydration journey."
      footer={
        <>
          Already have an account? <AuthLink to="/auth/login">Log in</AuthLink>
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
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
        <AuthField
          label="Confirm password"
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />

        {error && (
          <p className="text-[13px] text-[#C44]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {error}
          </p>
        )}

        {success && (
          <p className="text-[13px] text-[#7BAE7F]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password || !confirmPassword}
          className="mt-2 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition disabled:opacity-50"
          style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}
