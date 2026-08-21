interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={className}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent read`}
      style={{ width: size, height: size, position: "relative" }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[0.62rem] font-semibold tabular-nums text-muted-foreground">
        {Math.round(clamped)}
      </span>
    </div>
  );
}
