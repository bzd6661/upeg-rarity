import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAMED_SETS, setMembers } from "../lib/sets";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Sets({ bundle }: Props) {
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6">
          <h2 className="text-3xl font-bold">Notable Sets</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Curated cohorts that surface specific patterns the global ranking
            can't show on its own.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAMED_SETS.map((set) => {
            const members = setMembers(set, bundle.upegs.items);
            const sample = members[0];
            const pct = (members.length / bundle.upegs.total_minted) * 100;
            return (
              <Link
                key={set.slug}
                to={`/sets/${set.slug}`}
                className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition hover:border-emerald-700 hover:bg-accent/20"
              >
                {sample && (
                  <div
                    className="h-20 w-20 shrink-0 rounded border border-border [image-rendering:pixelated]"
                    dangerouslySetInnerHTML={{ __html: sample.svg }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-semibold group-hover:text-emerald-300">
                    {set.badge && <span>{set.badge}</span>}
                    <span>{set.title}</span>
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {set.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-700/60 bg-emerald-950/30 text-emerald-400 font-mono"
                    >
                      {members.length}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
