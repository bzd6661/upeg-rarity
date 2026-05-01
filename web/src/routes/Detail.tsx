import { Link, useParams } from "react-router-dom";
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
  "has_legsBack",
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
      <div className="text-zinc-400">
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
    <div>
      {/* Back link */}
      <Link
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        to="/"
      >
        ← Back to ranking
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[360px_1fr]">
        {/* SVG container */}
        <div
          className={`aspect-square w-full overflow-hidden rounded-xl border bg-zinc-900 p-2 [image-rendering:pixelated] ${
            isTop10
              ? "border-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "border-zinc-800"
          }`}
          dangerouslySetInnerHTML={{ __html: item.svg }}
        />

        {/* Trait panel */}
        <div>
          {/* Heading + rank badge */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-mono text-4xl font-bold text-zinc-100">uPEG #{item.id}</h2>
              <p className="mt-1 font-mono text-sm text-zinc-400">
                Score {item.score.toFixed(2)}
              </p>
            </div>
            <div
              className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 ${
                isTop10
                  ? "border-emerald-600 bg-emerald-950/60 ring-1 ring-emerald-700"
                  : "border-zinc-700 bg-zinc-900"
              }`}
              aria-label={`Rank ${item.rank}`}
            >
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">Rank</span>
              <span
                className={`font-mono text-2xl font-bold ${
                  isTop10 ? "text-emerald-400" : "text-zinc-200"
                }`}
              >
                #{item.rank}
              </span>
              {/* hidden node for test selectors that match "Rank N" */}
              <span className="sr-only">Rank {item.rank}</span>
            </div>
          </div>

          {/* Big color-count stat */}
          {nColors !== undefined && (
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-300">{nColors}</span>
                <span className="text-sm text-emerald-400">distinct colors</span>
              </div>
              {nColorsFreq != null && (
                <span className="text-xs text-emerald-500">
                  ({(nColorsFreq * 100).toFixed(1)}% of collection)
                </span>
              )}
              {nColors === 2 && (
                <span className="ml-auto rounded-full border border-emerald-500 bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Bichrome
                </span>
              )}
            </div>
          )}

          {/* Presence flags */}
          {PRESENCE_FLAGS.some((k) => item.traits[k] !== undefined) && (
            <div className="mt-5">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
                Has
              </h3>
              <div className="flex flex-wrap gap-2">
                {PRESENCE_FLAGS.filter((k) => item.traits[k] !== undefined).map((k) => {
                  const has = item.traits[k] === 1;
                  const label = k.replace("has_", "");
                  const freq = has ? freqOf(k, 1) : freqOf(k, 0);
                  return (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                        has
                          ? "border-emerald-700 bg-emerald-950/60 text-emerald-100"
                          : "border-zinc-800 bg-zinc-900 text-zinc-500"
                      }`}
                    >
                      <span className={has ? "text-emerald-400" : "text-zinc-600"}>
                        {has ? "✓" : "✗"}
                      </span>
                      {label}
                      {freq != null && (
                        <span className={has ? "text-emerald-500" : "text-zinc-600"}>
                          ({(freq * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="my-5 border-t border-zinc-800" />

          {/* Shape style values */}
          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Style
            </h3>
            <div className="flex flex-wrap gap-2">
              {STYLE_TRAITS.filter((k) => item.traits[k] !== undefined).map((k) => (
                <TraitChip
                  key={k}
                  label={k}
                  value={item.traits[k]}
                  frequency={freqOf(k, item.traits[k])}
                />
              ))}
            </div>
          </div>

          <div className="my-5 border-t border-zinc-800" />

          {/* Owner */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Owner</span>
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
        </div>
      </div>
    </div>
  );
}
