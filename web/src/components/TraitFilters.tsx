import { useState } from "react";
import type { TraitFilter } from "../lib/filters";

// Categories shown in the featured section, in display order.
const FEATURED_ORDER = [
  "n_distinct_colors",
  "has_hair",
  "has_horn",
  "has_wings",
  "has_legsBack",
  "has_accessories",
  "hair",
  "horn",
  "wings",
  "tail",
  "legsBack",
  "legsFront",
  "accessories",
] as const;

// Shape traits where value=0 means "absent" — render the 0 chip as "none".
const ABSENCE_AS_NONE = new Set([
  "hair", "horn", "wings", "legsBack", "accessories",
]);

// Friendly labels for each category in the sidebar.
const CATEGORY_LABEL: Record<string, string> = {
  n_distinct_colors: "Distinct colors",
  has_hair: "Has hair",
  has_horn: "Has horn",
  has_wings: "Has wings",
  has_legsBack: "Has back legs",
  has_accessories: "Has accessories",
  legsBack: "Back legs",
  legsFront: "Front legs",
};

// Render a value display label given the category and value.
function valueLabel(category: string, raw: string): string {
  if (category.startsWith("has_")) {
    return raw === "1" ? "yes" : raw === "0" ? "no" : raw;
  }
  if (ABSENCE_AS_NONE.has(category) && raw === "0") {
    return "none";
  }
  return raw;
}

interface Props {
  trait_frequencies: Record<string, Record<string, number>>;
  value: TraitFilter;
  onChange: (next: TraitFilter) => void;
}

export function TraitFilters({ trait_frequencies, value, onChange }: Props) {
  const [showMore, setShowMore] = useState(false);

  const toggle = (cat: string, val: string) => {
    const current = value[cat] ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...value, [cat]: next });
  };

  const hasActiveFilters = Object.values(value).some((arr) => arr.length > 0);

  const resetAll = () => onChange({});

  const renderCategory = (cat: string) => {
    const vals = trait_frequencies[cat];
    if (!vals) return null;
    const label = CATEGORY_LABEL[cat] ?? cat;
    const sorted = Object.entries(vals).sort((a, b) => {
      // Sort numerically when possible
      const an = Number(a[0]);
      const bn = Number(b[0]);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a[0].localeCompare(b[0]);
    });
    return (
      <div key={cat}>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </h3>
        <div className="flex flex-wrap gap-1">
          {sorted.map(([raw, count]) => {
            const checked = (value[cat] ?? []).includes(raw);
            return (
              <label
                key={raw}
                className={`cursor-pointer rounded border px-2 py-0.5 text-xs transition-colors ${
                  checked
                    ? "border-emerald-500 bg-emerald-900/40 text-emerald-100"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={checked}
                  onChange={() => toggle(cat, raw)}
                />
                {valueLabel(cat, raw)}{" "}
                <span className="text-zinc-500">({count})</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Categorize all keys into featured (in order) and "more"
  const featured = FEATURED_ORDER.filter((cat) => cat in trait_frequencies);
  const more = Object.keys(trait_frequencies)
    .filter((cat) => !FEATURED_ORDER.includes(cat as typeof FEATURED_ORDER[number]))
    .sort();

  return (
    <div className="space-y-5">
      {hasActiveFilters && (
        <button
          onClick={resetAll}
          className="text-xs text-emerald-500 hover:text-emerald-300 transition-colors"
        >
          ✕ Reset all filters
        </button>
      )}
      {featured.map(renderCategory)}

      {more.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>{showMore ? "▾" : "▸"}</span>
            <span>More filters ({more.length})</span>
          </button>
          {showMore && <div className="mt-3 space-y-5">{more.map(renderCategory)}</div>}
        </div>
      )}
    </div>
  );
}
