import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Droplet, Flame } from "lucide-react";

export function MobileShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/", label: "Home", icon: Home },
    { to: "/log", label: "Log", icon: Droplet },
    { to: "/streak", label: "Streak", icon: Flame },
  ] as const;

  return (
    <div className="min-h-screen w-full flex justify-center bg-white">
      <div className="relative w-full max-w-[440px] min-h-screen bg-white flex flex-col">
        <main className="flex-1 pb-24">{children}</main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white border-t border-[#E8E8E8]">
          <ul className="grid grid-cols-3">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? path === "/" : path.startsWith(to);
              return (
                <li key={to}>
                  <Link to={to} className="flex flex-col items-center justify-center gap-1 py-3 relative">
                    <Icon size={22} className={active ? "text-[#1A1A1A]" : "text-[#9A9A9A]"} strokeWidth={2} />
                    <span
                      className={`text-[11px] ${active ? "text-[#1A1A1A]" : "text-[#9A9A9A]"}`}
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      {label}
                    </span>
                    {active && <span className="absolute bottom-1 h-[3px] w-8 rounded-full bg-[#A8D5E2]" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
