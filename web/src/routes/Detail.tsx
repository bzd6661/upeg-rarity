import { Link, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TraitChip } from "../components/TraitChip";
import type { DataBundle } from "../types";

// Shape traits to show in the "Style" section. Order matters for visual stability.
const STYLE_TRAITS = [
  "hair",
  "horn",
  "wings",
  "tail",
  "legsBack",
  "legsFront",
  "accessories",
] as const;

// Presence flags shown as ✓/✗ pills
const PRESENCE_FLAGS = [
  "has_hair",
  "has_horn",
  "has_wings",
  "has_tail",
  "has_accessories",
] as const;

interface Props {
  bundle: DataBundle;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Detail({ bundle }: Props) {
  const { id } = useParams<{ id: string }>();
  const item = id != null ? bundle.byId.get(Number(id)) : undefined;

  if (!item) {
    return (
      <ScrollArea className="h-full">
        <div className="mx-auto max-w-6xl p-6 text-zinc-400">
          <Link
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            to="/"
          >
            ← Back to ranking
          </Link>
          <p className="mt-4">
            Upeg #{id} not found.{" "}
            <Link className="underline" to="/">
              Back to ranking
            </Link>
          </p>
        </div>
      </ScrollArea>
    );
  }

  const freqOf = (k: string, v: string | number) => {
    const slot = bundle.stats.trait_frequencies[k];
    if (!slot) return undefined;
    const count = slot[String(v)];
    return count != null ? count / bundle.stats.total_minted : undefined;
  };

  const nColors = item.traits.n_distinct_colors as number | undefined;
  const nColorsFreq = nColors != null ? freqOf("n_distinct_colors", nColors) : undefined;
  const isTop10 = item.rank <= 10;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Link
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          to="/"
        >
          ← Back to ranking
        </Link>

        <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
          {/* SVG card */}
          <Card
            className={`overflow-hidden ${
              isTop10
                ? "border-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : ""
            }`}
          >
            <CardContent className="p-4">
              <div
                className="aspect-square w-full rounded-md [image-rendering:pixelated]"
                dangerouslySetInnerHTML={{ __html: item.svg }}
              />
            </CardContent>
          </Card>

          {/* Trait panel */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="font-mono text-3xl">
                    uPEG #{item.id}
                  </CardTitle>
                  <div
                    className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 w-fit ${
                      isTop10
                        ? "border-emerald-600 bg-emerald-950/60"
                        : "border-zinc-700 bg-zinc-900"
                    }`}
                    aria-label={`Rank ${item.rank}`}
                  >
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Rank
                    </span>
                    <span
                      className={`font-mono text-xl font-bold ${
                        isTop10 ? "text-emerald-400" : "text-zinc-200"
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <span className="sr-only">Rank {item.rank}</span>
                  </div>
                </div>
                {isTop10 && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500 text-emerald-300"
                  >
                    Top 10
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {nColors !== undefined && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-700/60 bg-emerald-950/40 p-3">
                  <span className="text-3xl font-bold text-emerald-300">
                    {nColors}
                  </span>
                  <span className="text-sm text-emerald-400">
                    distinct colors
                  </span>
                  {nColorsFreq != null && (
                    <span className="ml-auto text-xs text-emerald-500">
                      {(nColorsFreq * 100).toFixed(1)}% of collection
                    </span>
                  )}
                  {nColors === 2 && (
                    <Badge className="bg-emerald-700 hover:bg-emerald-700">
                      Bichrome
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {PRESENCE_FLAGS.some((k) => item.traits[k] !== undefined) && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Has
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {PRESENCE_FLAGS.filter(
                      (k) => item.traits[k] !== undefined
                    ).map((k) => {
                      const has = item.traits[k] === 1;
                      const label = k.replace("has_", "");
                      const freq = has ? freqOf(k, 1) : freqOf(k, 0);
                      return (
                        <Badge
                          key={k}
                          variant={has ? "default" : "secondary"}
                          className={
                            has
                              ? "bg-emerald-700 hover:bg-emerald-700 border-emerald-700"
                              : "opacity-60"
                          }
                        >
                          <span className="mr-1">{has ? "✓" : "✗"}</span>
                          {label}
                          {freq != null && (
                            <span className="ml-1.5 opacity-70">
                              ({(freq * 100).toFixed(1)}%)
                            </span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Style
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TRAITS.filter(
                    (k) => item.traits[k] !== undefined
                  ).map((k) => (
                    <TraitChip
                      key={k}
                      label={k}
                      value={item.traits[k]}
                      frequency={freqOf(k, item.traits[k])}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border border-border bg-zinc-900/50 px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Owner
                </span>
                <div className="mt-1">
                  <Link
                    className="font-mono text-sm text-zinc-300 hover:text-emerald-400 transition-colors"
                    to={`/holder/${item.owner}`}
                    title={item.owner}
                  >
                    {truncateAddress(item.owner)}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
