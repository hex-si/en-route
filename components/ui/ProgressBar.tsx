interface ProgressBarProps {
  current: number;
  max: number;
}

export function ProgressBar({ current, max }: ProgressBarProps) {
  const pct = Math.round((current / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">Profile progress</span>
        <span className="font-semibold text-[var(--primary)]">{current}/{max} pts</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary)] to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{pct}% complete</p>
    </div>
  );
}
