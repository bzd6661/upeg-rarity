import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TraitFilters } from "../components/TraitFilters";
import { FollowPrompt } from "../components/FollowPrompt";
import {
  applyFilters,
  searchById,
  sortByRank,
  type TraitFilter,
} from "../lib/filters";
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
  const [listHeight, setListHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure available height for the virtualized list via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setListHeight(Math.max(300, rect.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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

  const filterPanel = (
    <>
      <div className="mb-3">
        <Input
          placeholder="Search by ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleSearchFocus}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-600"
        />
      </div>
      <TraitFilters
        trait_frequencies={bundle.stats.trait_frequencies}
        value={filter}
        onChange={setFilter}
      />
    </>
  );

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex lg:flex-col border-r border-border p-4 overflow-hidden">
        <div className="mb-3">
          <Input
            placeholder="Search by ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleSearchFocus}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-600"
          />
        </div>
        <ScrollArea className="flex-1">
          <TraitFilters
            trait_frequencies={bundle.stats.trait_frequencies}
            value={filter}
            onChange={setFilter}
          />
        </ScrollArea>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 flex-col p-4">
        {/* Mobile filter sheet trigger */}
        <div className="mb-3 flex items-center gap-3 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-background">
              <div className="mt-6">{filterPanel}</div>
            </SheetContent>
          </Sheet>
        </div>

        <p className="mb-3 text-sm text-zinc-400">
          Showing {filtered.length} of{" "}
          {bundle.upegs.total_minted.toLocaleString()}
        </p>

        <div
          ref={containerRef}
          className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden"
        >
          <List
            height={listHeight}
            itemCount={filtered.length}
            itemSize={88}
            width="100%"
          >
            {({ index, style }) => {
              const item = filtered[index];
              const isTop100 = item.rank <= 100;
              return (
                <Link
                  to={`/upeg/${item.id}`}
                  style={style}
                  className="flex items-center gap-6 border-b border-border px-2 transition-colors hover:bg-accent/40 cursor-pointer"
                >
                  {/* Rank + SVG + ID */}
                  <div className="flex shrink-0 items-center gap-4">
                    <span
                      className={`w-14 shrink-0 text-right font-mono text-sm font-semibold ${rankColor(item.rank)}`}
                    >
                      #{item.rank}
                    </span>
                    <div
                      className="h-14 w-14 shrink-0 rounded-md border border-border bg-zinc-900 p-0.5 [image-rendering:pixelated]"
                      dangerouslySetInnerHTML={{ __html: item.svg }}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-zinc-100">
                        #{item.id}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 text-xs">
                    {item.traits.n_distinct_colors !== undefined && (
                      <Badge
                        variant="outline"
                        className="border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
                      >
                        {item.traits.n_distinct_colors} colors
                      </Badge>
                    )}
                    {item.traits.n_distinct_colors === 2 && (
                      <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white">
                        Bichrome
                      </Badge>
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
                        <Badge
                          key={label}
                          variant="secondary"
                          className={
                            isTop100
                              ? "bg-zinc-700 text-zinc-200"
                              : "bg-zinc-800 text-zinc-400"
                          }
                        >
                          {label}
                        </Badge>
                      ))}
                  </div>
                </Link>
              );
            }}
          </List>
        </div>
      </div>

      <FollowPrompt open={showFollow} onClose={() => setShowFollow(false)} />
    </div>
  );
}
