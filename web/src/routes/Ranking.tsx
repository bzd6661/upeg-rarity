import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { TraitFilters } from "../components/TraitFilters";
import { applyFilters, searchById, sortByRank, type TraitFilter } from "../lib/filters";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Ranking({ bundle }: Props) {
  const [filter, setFilter] = useState<TraitFilter>({});
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (query.trim()) {
      const hit = searchById(bundle.upegs.items, query);
      return hit ? [hit] : [];
    }
    return sortByRank(applyFilters(bundle.upegs.items, filter));
  }, [bundle, filter, query]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <input
          type="text"
          placeholder="Search by ID..."
          className="mb-4 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <TraitFilters trait_frequencies={bundle.stats.trait_frequencies} value={filter} onChange={setFilter} />
      </aside>
      <main>
        <p className="mb-4 text-sm text-zinc-400">
          Showing {filtered.length} of {bundle.upegs.total_minted}
        </p>
        <List height={600} itemCount={filtered.length} itemSize={68} width="100%">
          {({ index, style }) => {
            const item = filtered[index];
            return (
              <div style={style} className="flex items-center gap-4 border-b border-zinc-900 px-2">
                <span className="w-12 text-right font-mono text-zinc-400">#{item.rank}</span>
                <div
                  className="h-12 w-12 [image-rendering:pixelated]"
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
                <Link to={`/upeg/${item.id}`} className="font-mono hover:underline">
                  #{item.id}
                </Link>
                <span className="text-sm text-zinc-400">score {item.score.toFixed(2)}</span>
                <div className="ml-auto flex flex-wrap gap-1 text-xs">
                  {Object.entries(item.traits)
                    .filter(([k]) => !k.startsWith("has_") && !k.startsWith("n_"))
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <span key={k} className="rounded bg-zinc-800 px-2 py-0.5">
                        {k}: {String(v)}
                      </span>
                    ))}
                  {item.traits.n_distinct_colors === 2 && (
                    <span className="rounded-full border border-emerald-600 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                      Bichrome
                    </span>
                  )}
                </div>
              </div>
            );
          }}
        </List>
      </main>
    </div>
  );
}
