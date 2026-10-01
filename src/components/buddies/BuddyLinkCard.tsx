import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import type { StreakBuddiesViewModel } from "@/hooks/useStreakBuddies";

const NUNITO = { fontFamily: "Nunito, system-ui, sans-serif" };
const INTER = { fontFamily: "Inter, system-ui, sans-serif" };

/**
 * Pairs two real accounts. Until a pairing exists the buddy column on this page is demo
 * data held on one device, so this card is the gate to the real shared experience.
 */
export function BuddyLinkCard({
  link,
  buddyName,
}: {
  link: StreakBuddiesViewModel["link"];
  buddyName: string;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const invite = link.invite;

  const handleCopy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const expiry = invite
    ? new Date(invite.expiresAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <section className="px-5 mt-5">
      <p className="text-[12px] uppercase tracking-wider text-[#6B6B6B] mb-3" style={INTER}>
        Pair {buddyName}&apos;s real account
      </p>
      <div className="rounded-2xl border border-[#E8E8E8] bg-white p-4">
        <p className="text-[12px] leading-relaxed text-[#6B6B6B]" style={INTER}>
          Right now {buddyName}&apos;s side below is demo data on this device. Pair two real
          accounts and both sides become real everywhere.
        </p>

        {invite ? (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-xl border border-[#1A1A1A] bg-[#F9F9F9] px-3 py-2.5 text-center text-[20px] font-bold tracking-[0.3em] text-[#1A1A1A]"
                style={NUNITO}
              >
                {invite.code}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-11 items-center gap-1 rounded-xl border border-[#1A1A1A] px-3 text-[12px] font-bold text-[#1A1A1A] active:scale-[0.98]"
                style={NUNITO}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[#6B6B6B]" style={INTER}>
              Send it to {buddyName}. Valid until {expiry} (14 days).
            </p>
            <button
              type="button"
              onClick={() => link.createInvite(name.trim() || undefined)}
              disabled={link.pending.invite}
              className="mt-2 text-[11px] text-[#6B6B6B] underline"
              style={INTER}
            >
              {link.pending.invite ? "Working…" : "Make a new code"}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <label className="text-[11px] text-[#6B6B6B]" style={INTER} htmlFor="buddy-name">
              The name {buddyName} will see
            </label>
            <input
              id="buddy-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={link.suggestedName}
              className="mt-1 w-full rounded-xl border border-[#E8E8E8] px-3 py-2.5 text-[13px] text-[#1A1A1A]"
              style={INTER}
            />
            <button
              type="button"
              onClick={() => link.createInvite(name.trim() || undefined)}
              disabled={link.pending.invite}
              className="mt-2 h-11 w-full rounded-xl bg-[#A8D5E2] text-[13px] font-bold text-[#1A1A1A] active:scale-[0.99] disabled:opacity-60"
              style={NUNITO}
            >
              {link.pending.invite ? "Creating…" : "Create invite code"}
            </button>
          </div>
        )}
        {link.inviteError && (
          <p className="mt-2 text-[11px] text-[#B3413B]" style={INTER}>
            {link.inviteError}
          </p>
        )}

        <div className="mt-4 border-t border-[#E8E8E8] pt-3">
          {joinOpen ? (
            <div>
              <label className="text-[11px] text-[#6B6B6B]" style={INTER} htmlFor="buddy-code">
                Code from {buddyName}
              </label>
              <input
                id="buddy-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                className="mt-1 w-full rounded-xl border border-[#E8E8E8] px-3 py-2.5 text-center text-[16px] font-bold tracking-[0.25em] text-[#1A1A1A]"
                style={NUNITO}
              />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={`Your name (${link.suggestedName})`}
                className="mt-2 w-full rounded-xl border border-[#E8E8E8] px-3 py-2.5 text-[13px] text-[#1A1A1A]"
                style={INTER}
              />
              <button
                type="button"
                onClick={() => link.acceptInvite(code.trim(), name.trim() || undefined)}
                disabled={link.pending.accept || code.trim().length < 4}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A1A] text-[13px] font-bold text-[#1A1A1A] active:scale-[0.99] disabled:opacity-60"
                style={NUNITO}
              >
                <Link2 size={15} />
                {link.pending.accept ? "Joining…" : `Join ${buddyName}`}
              </button>
              {link.acceptError && (
                <p className="mt-2 text-[11px] text-[#B3413B]" style={INTER}>
                  {link.acceptError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="w-full text-[12px] text-[#6B6B6B] underline"
              style={INTER}
            >
              {buddyName} sent me a code
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
