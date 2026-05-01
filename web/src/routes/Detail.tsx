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

export function Detail({ bundle }: Props) {
  const { id } = useParams<{ id: string }>();
  const item = id != null ? bundle.byId.get(Number(id)) : undefined;

  if (!item) {
    return (
      <div className="text-zinc-400">
        Upeg #{id} not found. <Link className="underline" to="/">Back to ranking</Link>
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

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <div
        className="aspect-square w-full rounded-lg border border-zinc-800 bg-zinc-900 [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: item.svg }}
      />
      <div>
        <h2 className="font-mono text-3xl">uPEG #{item.id}</h2>
        <p className="mt-1 text-zinc-400">
          Rank {item.rank} · Score {item.score.toFixed(2)}
        </p>

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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
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

        {/* Shape style values */}
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
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

        <p className="mt-6 text-sm text-zinc-400">
          Holder:{" "}
          <Link className="font-mono underline" to={`/holder/${item.owner}`}>
            {item.owner}
          </Link>
        </p>
      </div>
    </div>
  );
}
