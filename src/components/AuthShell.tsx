import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PipImage } from "@/components/PipImage";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-white">
      <div className="w-full max-w-[440px] px-6 pt-10 pb-12 flex flex-col items-center">
        <PipImage mood="neutral" size={120} className="pip-float" />
        <h1
          className="mt-6 text-[22px] font-bold text-[#1A1A1A] text-center"
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {title}
        </h1>
        <p
          className="mt-2 text-[14px] text-[#6B6B6B] text-center max-w-[300px]"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {subtitle}
        </p>
        <div className="mt-8 w-full">{children}</div>
        <div className="mt-6 text-center">{footer}</div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  id,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  reveal,
  describedBy,
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** When true the field renders a show/hide control for password entry. */
  reveal?: boolean;
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);
  const inputType = reveal ? (shown ? "text" : "password") : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-describedby={describedBy}
          className={`mt-2 w-full h-12 rounded-xl border-[1.5px] border-[#1A1A1A] bg-white px-4 text-[16px] text-[#1A1A1A] outline-none disabled:opacity-50 ${
            reveal ? "pr-14" : ""
          }`}
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((prev) => !prev)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute right-1 top-1/2 mt-1 h-11 w-11 flex items-center justify-center rounded-lg text-[#6B6B6B] active:scale-[0.97] transition"
          >
            {shown ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthSubmit({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="mt-2 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition disabled:opacity-50"
      style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
    >
      {children}
    </button>
  );
}

/**
 * Inline status text for the auth screens.
 * Never render provider error strings straight through: they can carry account
 * or token detail. Use the mapped messages built in each route instead.
 */
export function AuthNotice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const colours: Record<"error" | "success" | "info", string> = {
    error: "text-[#C44]",
    success: "text-[#7BAE7F]",
    info: "text-[#6B6B6B]",
  };

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`text-[13px] ${colours[tone]}`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {children}
    </p>
  );
}

export function AuthLink({
  to,
  children,
}: {
  to: "/auth/login" | "/auth/signup" | "/auth/forgot-password" | "/auth/reset-password";
  children: ReactNode;
}) {
  return (
    <Link to={to} className="text-[13px] text-[#6B6B6B] underline" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {children}
    </Link>
  );
}
