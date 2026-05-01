import type { TraitFilter } from "../lib/filters";

interface Props {
  trait_frequencies: Record<string, Record<string, number>>;
  value: TraitFilter;
  onChange: (next: TraitFilter) => void;
}

export function TraitFilters({ trait_frequencies, value, onChange }: Props) {
  const toggle = (cat: string, val: string) => {
    const current = value[cat] ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...value, [cat]: next });
  };

  return (
    <div className="space-y-4">
      {Object.entries(trait_frequencies).map(([cat, vals]) => (
        <div key={cat}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{cat}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(vals).map(([v, count]) => {
              const checked = (value[cat] ?? []).includes(v);
              return (
                <label
                  key={v}
                  className={`cursor-pointer rounded border px-2 py-1 text-xs ${
                    checked ? "border-emerald-500 bg-emerald-900/40" : "border-zinc-700 bg-zinc-900"
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(cat, v)} />
                  {v} <span className="text-zinc-500">({count})</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
