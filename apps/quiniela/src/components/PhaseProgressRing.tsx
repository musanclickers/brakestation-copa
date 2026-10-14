'use client';

export function PhaseProgressRing({ predicted, total }: { predicted: number; total: number }) {
  const pct = total > 0 ? (predicted / total) * 100 : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width="72" height="72" className="-rotate-90" aria-hidden="true">
      <circle
        cx="36" cy="36" r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
      />
      <circle
        cx="36" cy="36" r={radius}
        fill="none"
        stroke="url(#progressGrad)"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E32125" />
          <stop offset="100%" stopColor="#FFD400" />
        </linearGradient>
      </defs>
    </svg>
  );
}
