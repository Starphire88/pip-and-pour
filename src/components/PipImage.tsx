import neutral from "@/assets/pip-neutral.png.asset.json";
import happy from "@/assets/pip-happy.png.asset.json";
import sad from "@/assets/pip-sad.png.asset.json";
import collapsed from "@/assets/pip-collapsed.png.asset.json";

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
      src={map[mood].url}
      alt={`Pip the panda — ${mood}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`block object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
