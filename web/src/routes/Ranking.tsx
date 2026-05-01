import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { TraitFilters } from "../components/TraitFilters";
import { FollowPrompt } from "../components/FollowPrompt";
import { applyFilters, searchById, sortByRank, type TraitFilter } from "../lib/filters";
import type { DataBundle } from "../types";

const FOLLOWED_KEY = "upeg-rarity:follow-prompted-v2";

interface Props {
  bundle: DataBundle;
}

function rankColor(rank: number): string {
  if (rank <= 10) return "text-emerald-400";
  if (rank <= 100) return "text-yellow-200";
  return "text-zinc-500";
}

export function Ranking({ bundle }: Props) {
  const [filter, setFilter] = useState<TraitFilter>({});
  const [query, setQuery] = useState("");
  const [showFollow, setShowFollow] = useState(false);

  const handleSearchFocus = () => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FOLLOWED_KEY)) return;
    window.localStorage.setItem(FOLLOWED_KEY, "1");
    setShowFollow(true);
  };

  const filtered = useMemo(() => {
    if (query.trim()) {
      const hit = searchById(bundle.upegs.items, query);
      return hit ? [hit] : [];
    }
    return sortByRank(applyFilters(bundle.upegs.items, filter));
  }, [bundle, filter, query]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-[65px] lg:self-start">
        {/* Search box */}
        <div className="relative mb-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by ID..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleSearchFocus}
          />
        </div>
        <TraitFilters trait_frequencies={bundle.stats.trait_frequencies} value={filter} onChange={setFilter} />
      </aside>
      <FollowPrompt open={showFollow} onClose={() => setShowFollow(false)} />
      <main>
        <p className="mb-3 text-xs font-medium text-zinc-500">
          Showing {filtered.length} of {bundle.upegs.total_minted}
        </p>
        <List height={600} itemCount={filtered.length} itemSize={88} width="100%">
          {({ index, style }) => {
            const item = filtered[index];
            const isTop10 = item.rank <= 10;
            const isTop100 = item.rank <= 100;
            return (
              <Link
                to={`/upeg/${item.id}`}
                style={style}
                className="flex items-center gap-6 border-b border-zinc-800/60 px-2 transition-all duration-100 hover:bg-zinc-900 hover:shadow-md cursor-pointer"
              >
                {/* Left zone: rank + SVG + ID/score */}
                <div className="flex shrink-0 items-center gap-4">
                  {/* Rank */}
                  <span
                    className={`w-14 shrink-0 text-right font-mono text-sm font-semibold ${rankColor(item.rank)}`}
                  >
                    #{item.rank}
                  </span>

                  {/* SVG */}
                  <div
                    className="h-14 w-14 shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-0.5 shadow-sm [image-rendering:pixelated]"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />

                  {/* ID */}
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-zinc-100">
                      #{item.id}
                    </div>
                  </div>
                </div>

                {/* Right zone: tags, right-aligned, fills remaining space */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 text-xs">
                  {item.traits.n_distinct_colors !== undefined && (
                    <span
                      className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 ${
                        isTop10
                          ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                          : "border-emerald-800 bg-emerald-950/30 text-emerald-400"
                      }`}
                    >
                      {item.traits.n_distinct_colors} colors
                    </span>
                  )}
                  {item.traits.n_distinct_colors === 2 && (
                    <span className="flex-shrink-0 rounded-full border border-emerald-500 bg-emerald-900/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Bichrome
                    </span>
                  )}
                  {[
                    ["hair", "has_hair"],
                    ["horn", "has_horn"],
                    ["wings", "has_wings"],
                    ["tail", "has_tail"],
                    ["accessories", "has_accessories"],
                  ]
                    .filter(([, key]) => item.traits[key] === 1)
                    .map(([label]) => (
                      <span
                        key={label}
                        className={`flex-shrink-0 rounded px-2.5 py-0.5 ${
                          isTop100
                            ? "bg-zinc-700 text-zinc-200"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                </div>
              </Link>
            );
          }}
        </List>
      </main>
    </div>
  );
}
