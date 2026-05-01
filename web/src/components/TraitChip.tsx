interface Props {
  label: string;
  value: string | number;
  frequency?: number; // 0..1
  derived?: boolean;
}

export function TraitChip({ label, value, frequency, derived }: Props) {
  const rarityHint = frequency != null ? `${(frequency * 100).toFixed(1)}%` : null;
  const baseClass = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs";
  const colorClass = derived
    ? "border-emerald-700 bg-emerald-950/60 text-emerald-100"
    : "border-zinc-700 bg-zinc-900";
  return (
    <span className={`${baseClass} ${colorClass}`}>
      <span className={derived ? "text-emerald-400" : "text-zinc-400"}>{label}:</span>
      <span className="font-medium">{String(value)}</span>
      {rarityHint && <span className={derived ? "text-emerald-500" : "text-zinc-500"}>({rarityHint})</span>}
    </span>
  );
}
