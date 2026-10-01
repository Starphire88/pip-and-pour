/**
 * Segmented progress bar, matching the block style used in the product brief.
 * Built from existing theme tokens rather than a new charting dependency.
 */
export function SegmentedBar({
  percent,
  tint = "#A8D5E2",
  segments = 10,
  ariaLabel,
}: {
  percent: number;
  tint?: string;
  segments?: number;
  ariaLabel?: string;
}) {
  const safe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const filled = Math.round((safe / 100) * segments);

  return (
    <div
      className="flex gap-[3px] w-full"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `${safe}% complete`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="h-2.5 flex-1 rounded-[3px] transition-colors duration-500"
          style={{ background: i < filled ? tint : "#E8E8E8" }}
        />
      ))}
    </div>
  );
}
