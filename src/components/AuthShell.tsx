import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 w-full h-12 rounded-xl border-[1.5px] border-[#1A1A1A] bg-white px-4 text-[16px] text-[#1A1A1A] outline-none"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      />
    </div>
  );
}

export function AuthLink({ to, children }: { to: "/auth/login" | "/auth/signup"; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] text-[#6B6B6B] underline" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {children}
    </Link>
  );
}
