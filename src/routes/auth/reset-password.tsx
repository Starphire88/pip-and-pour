import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { AuthField, AuthLink, AuthNotice, AuthShell, AuthSubmit } from "@/components/AuthShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — New password" },
      { name: "description", content: "Choose a new password for your Pip account." },
    ],
  }),
  component: ResetPasswordPage,
});

/**
 * Snapshot the recovery payload before anything else touches the URL.
 *
 * Supabase sends the user back with either a hash fragment (implicit flow) or a
 * `?code=` query (PKCE), and supabase-js clears the URL once it has consumed it.
 * Reading it at module scope means the page still knows a recovery link was used
 * even after that cleanup, including on the malformed and expired shapes.
 */
const initialHash = typeof window === "undefined" ? "" : window.location.hash;
const initialSearch = typeof window === "undefined" ? "" : window.location.search;

const MIN_PASSWORD_LENGTH = 6;

type Status = "checking" | "ready" | "invalid" | "done";

function readInitialParams() {
  // Prefer whatever is in the URL right now; fall back to the pre-cleanup snapshot.
  // The live read covers fragment-only navigations (same document, so the module
  // never re-evaluates); the snapshot covers supabase-js having already cleared it.
  const liveHash = typeof window === "undefined" ? "" : window.location.hash;
  const liveSearch = typeof window === "undefined" ? "" : window.location.search;
  const hash = new URLSearchParams((liveHash || initialHash).replace(/^#/, ""));
  const search = new URLSearchParams(liveSearch || initialSearch);
  return {
    hash,
    search,
    accessToken: hash.get("access_token"),
    type: hash.get("type") ?? search.get("type"),
    code: search.get("code"),
    tokenHash: search.get("token_hash"),
    errorCode: hash.get("error_code") ?? search.get("error_code"),
    errorDescription: hash.get("error_description") ?? search.get("error_description"),
  };
}

function recoveryErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case "otp_expired":
      return "That reset link has expired. Request a new one and it will work.";
    case "access_denied":
      return "That reset link is no longer valid. It may already have been used.";
    default:
      return "That reset link is not valid. Request a new one to continue.";
  }
}

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
  if (lower.includes("should be different")) {
    return "Your new password must be different from your current password.";
  }
  if (lower.includes("password should be at least")) {
    return `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (lower.includes("session") && (lower.includes("missing") || lower.includes("expired"))) {
    return "Your reset session has expired. Request a new link to continue.";
  }
  return "We couldn't update your password. Request a new link and try again.";
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 text-[13px] ${met ? "text-[#7BAE7F]" : "text-[#6B6B6B]"}`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <Check size={14} aria-hidden="true" className={met ? "opacity-100" : "opacity-30"} />
      <span>{children}</span>
    </li>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [status, setStatus] = useState<Status>("checking");
  const [invalidReason, setInvalidReason] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  // Establish whether this visit carries a usable recovery credential.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const params = readInitialParams();

    const stripCredentialsFromUrl = () => {
      // Keep the token out of the address bar, history and any shared screenshot.
      window.history.replaceState(null, "", window.location.pathname);
    };

    const settle = (next: Status, reason = "") => {
      if (cancelled) return;
      if (next !== "ready") setInvalidReason(reason);
      setStatus(next);
      if (next !== "checking") stripCredentialsFromUrl();
    };

    const run = async () => {
      // Expired, reused or malformed links come back as an error in the fragment.
      if (params.errorCode || params.errorDescription) {
        settle("invalid", recoveryErrorMessage(params.errorCode));
        return;
      }

      try {
        // Custom email templates can deliver a token_hash for verifyOtp.
        if (params.tokenHash && params.type === "recovery") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: params.tokenHash,
          });
          if (verifyError) {
            settle("invalid", recoveryErrorMessage(params.errorCode));
            return;
          }
          settle("ready");
          return;
        }

        // PKCE links carry a code that has to be exchanged before a session exists.
        if (params.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) {
            settle("invalid", recoveryErrorMessage(params.errorCode));
            return;
          }
          settle("ready");
          return;
        }

        // Implicit links sign the user in via detectSessionInUrl. Give it a moment.
        const deadline = Date.now() + 4000;
        for (;;) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            settle("ready");
            return;
          }
          if (Date.now() >= deadline) break;
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (params.accessToken || params.type === "recovery") {
          settle("invalid", recoveryErrorMessage(null));
          return;
        }

        settle("invalid", "Open the reset link from your email to choose a new password.");
      } catch (thrown) {
        settle("invalid", friendlyError(thrown));
      }
    };

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        settle("ready");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      // Supabase hashes and stores the new password server side. The recovery
      // token is single use and is invalidated by this call.
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(friendlyError(updateError));
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setStatus("done");
    } catch (thrown) {
      setError(friendlyError(thrown));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = async () => {
    try {
      await signOut();
    } catch {
      // A failed sign out must not strand the user on this screen.
    }
    navigate({ to: "/auth/login", replace: true });
  };

  if (status === "checking") {
    return (
      <AuthShell
        title="Checking your link"
        subtitle="One moment while we verify your reset link."
        footer={<AuthLink to="/auth/login">Back to log in</AuthLink>}
      >
        <AuthNotice tone="info">Verifying…</AuthNotice>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell
        title="Link not usable"
        subtitle="Reset links are single use and expire one hour after they're sent."
        footer={
          <>
            Or go back to <AuthLink to="/auth/login">log in</AuthLink>
          </>
        }
      >
        <div className="space-y-4">
          <AuthNotice tone="error">{invalidReason}</AuthNotice>
          <AuthSubmit type="button" onClick={() => navigate({ to: "/auth/forgot-password" })}>
            Request a new link
          </AuthSubmit>
        </div>
      </AuthShell>
    );
  }

  if (status === "done") {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Your new password is ready to use."
        footer={
          <>
            Need help? <AuthLink to="/auth/forgot-password">Request another link</AuthLink>
          </>
        }
      >
        <div className="space-y-4">
          <AuthNotice tone="success">You can now log in with your new password.</AuthNotice>
          <AuthSubmit type="button" onClick={handleGoToLogin}>
            Go to log in
          </AuthSubmit>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you haven't used here before."
      footer={
        <>
          Don't want to change it? <AuthLink to="/auth/login">Back to log in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="New password"
          id="new-password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          disabled={submitting}
          reveal
          describedBy="password-requirements"
        />
        <AuthField
          label="Confirm new password"
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          disabled={submitting}
          reveal
          describedBy="password-requirements"
        />

        <ul id="password-requirements" className="space-y-1 pt-1 list-none">
          <Requirement met={password.length >= MIN_PASSWORD_LENGTH}>
            At least {MIN_PASSWORD_LENGTH} characters
          </Requirement>
          <Requirement met={password.length > 0 && password === confirmPassword}>
            Both passwords match
          </Requirement>
        </ul>

        {error && <AuthNotice tone="error">{error}</AuthNotice>}

        <AuthSubmit disabled={submitting || !password || !confirmPassword}>
          {submitting ? "Updating…" : "Update password"}
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
