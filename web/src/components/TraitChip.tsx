interface Props {
  label: string;
  value: string | number;
  frequency?: number; // 0..1
}

export function TraitChip({ label, value, frequency }: Props) {
  const rarityHint = frequency != null ? `${(frequency * 100).toFixed(1)}%` : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs">
      <span className="text-zinc-400">{label}:</span>
      <span className="font-medium">{String(value)}</span>
      {rarityHint && <span className="text-zinc-500">({rarityHint})</span>}
    </span>
  );
}
