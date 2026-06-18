import neutral from "@/assets/pip-neutral.png";
import happy from "@/assets/pip-happy.png";
import sad from "@/assets/pip-sad.png";
import collapsed from "@/assets/pip-collapsed.png";

const map = { neutral, happy, sad, collapsed } as const;

export function PipImage({
  mood,
  size = 200,
  className = "",
}: {
  mood: "neutral" | "happy" | "sad" | "collapsed";
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={map[mood]}
      alt={`Pip the panda — ${mood}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`block object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
