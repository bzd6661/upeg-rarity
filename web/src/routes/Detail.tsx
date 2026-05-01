import { Link, useParams } from "react-router-dom";
import { TraitChip } from "../components/TraitChip";
import type { DataBundle } from "../types";

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

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <div
        className="aspect-square w-full rounded-lg border border-zinc-800 bg-zinc-900 [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: item.svg }}
      />
      <div>
        <h2 className="font-mono text-3xl">uPEG #{item.id}</h2>
        <p className="mt-1 text-zinc-400">Rank {item.rank} · Score {item.score.toFixed(3)}</p>
        {(() => {
          const allEntries = Object.entries(item.traits);
          const isDerived = (k: string) => k.startsWith("has_") || k.startsWith("n_");
          const derivedEntries = allEntries.filter(([k]) => isDerived(k));
          const onChainEntries = allEntries.filter(([k]) => !isDerived(k));

          const freqOf = (k: string, v: string | number) => {
            const slot = bundle.stats.trait_frequencies[k];
            if (!slot) return undefined;
            const count = slot[String(v)];
            return count != null ? count / bundle.stats.total_minted : undefined;
          };

          return (
            <>
              {derivedEntries.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Special Attributes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {derivedEntries.map(([k, v]) => (
                      <TraitChip key={k} label={k} value={v} frequency={freqOf(k, v)} derived />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  On-chain Traits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {onChainEntries.map(([k, v]) => (
                    <TraitChip key={k} label={k} value={v} frequency={freqOf(k, v)} />
                  ))}
                </div>
              </div>
            </>
          );
        })()}
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
