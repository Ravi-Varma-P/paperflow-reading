import { useEffect, useRef, useState } from "react";
import { ProgressRing } from "@/components/ProgressRing";

interface ReaderProgressProps {
  /** Element whose scroll extent defines 100%. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Called with the latest percent (throttled to rAF). Kept out of React state upstream. */
  onProgress?: (percent: number) => void;
  initialPercent?: number;
}

/**
 * Owns the scroll listener so progress updates re-render only the thin bar and
 * ring — never the article body. Uses a passive listener + rAF coalescing.
 */
export function ReaderProgress({ targetRef, onProgress, initialPercent = 0 }: ReaderProgressProps) {
  const [percent, setPercent] = useState(initialPercent);
  const barRef = useRef<HTMLDivElement>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    let frame = 0;
    let last = -1;

    const measure = () => {
      frame = 0;
      const el = targetRef.current;
      if (!el) return;
      const total = el.scrollHeight + el.offsetTop - window.innerHeight;
      const value = Math.max(0, Math.min(100, (window.scrollY / Math.max(1, total)) * 100));
      if (Math.abs(value - last) < 0.15) return;
      last = value;
      if (barRef.current) barRef.current.style.transform = `scaleX(${value / 100})`;
      onProgressRef.current?.(value);
      // Ring only needs whole-number fidelity — avoids a render per frame.
      setPercent((prev) => (Math.round(prev) === Math.round(value) ? prev : value));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    measure();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetRef]);

  return (
    <>
      <div
        ref={barRef}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left bg-linear-to-r from-lavender to-coral will-change-transform"
        style={{ transform: `scaleX(${initialPercent / 100})` }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />
      <ProgressRing value={percent} size={34} />
    </>
  );
}
