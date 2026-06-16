export function PipBubble({ text }: { text: string }) {
  return (
    <div className="relative max-w-[320px] mx-auto bubble-in" key={text}>
      <div
        aria-hidden
        className="absolute left-1/2 -top-[9px] -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l-2 border-t-2 border-[#1A1A1A]"
      />
      <div className="relative rounded-2xl border-2 border-[#1A1A1A] bg-white px-4 py-3">
        <p
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          className="italic text-[14px] leading-snug text-[#1A1A1A] text-center line-clamp-2"
        >
          {text}
        </p>
      </div>
    </div>
  );
}
