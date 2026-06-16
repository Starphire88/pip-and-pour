export function ProgressRing({
  percent,
  total,
  goal,
  size = 200,
  stroke = 12,
}: {
  percent: number;
  total: number;
  goal: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E8E8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#A8D5E2"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          className="text-[32px] font-bold leading-none text-[#1A1A1A]"
        >
          {percent}%
        </span>
        <span className="mt-1 text-[12px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {total} / {goal} ml
        </span>
      </div>
    </div>
  );
}
