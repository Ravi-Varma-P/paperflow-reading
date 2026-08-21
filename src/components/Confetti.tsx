import { useEffect, useState } from "react";

const COLORS = ["bg-lavender", "bg-coral", "bg-ocean", "bg-moss"];

interface Piece {
  id: number;
  left: number;
  drift: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

export function Confetti({ fire, onDone }: { fire: boolean; onDone?: () => void }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!fire) return;
    const next: Piece[] = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 220,
      delay: Math.random() * 420,
      duration: 2200 + Math.random() * 1600,
      color: COLORS[i % COLORS.length] as string,
      size: 6 + Math.random() * 8,
    }));
    setPieces(next);
    const timer = window.setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [fire, onDone]);

  if (!pieces.length) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-100 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`absolute top-0 rounded-[2px] ${p.color}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            animation: `pp-fall ${p.duration}ms cubic-bezier(0.2,0.6,0.4,1) ${p.delay}ms forwards`,
            ["--pp-x" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
