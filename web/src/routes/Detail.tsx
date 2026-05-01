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
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(item.traits).map(([k, v]) => (
            <TraitChip
              key={k}
              label={k}
              value={v}
              frequency={bundle.stats.trait_frequencies[k]?.[String(v)] != null
                ? bundle.stats.trait_frequencies[k][String(v)] / bundle.stats.total_minted
                : undefined}
            />
          ))}
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
