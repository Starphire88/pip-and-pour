import { useEffect, useState } from "react";

const COLORS = ["#A8D5E2", "#7BAE7F", "#F2C57E", "#F4B8B8", "#1A1A1A"];

export function Confetti({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; x: number; delay: number; color: string; size: number }>>([]);

  useEffect(() => {
    if (!show) return;
    const arr = Array.from({ length: 40 }, (_, i) => ({
      id: i + Date.now(),
      left: Math.random() * 100,
      x: (Math.random() - 0.5) * 200,
      delay: Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(t);
  }, [show]);

  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ["--x" as never]: `${p.x}px`,
          }}
        />
      ))}
    </div>
  );
}
