import type { Upeg } from "../types";

interface Props {
  upeg: Upeg;
}

export function UpegCard({ upeg }: Props) {
  const isBichrome = upeg.traits.n_distinct_colors === 2;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-600">
      <div
        className="h-24 w-24 [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: upeg.svg }}
      />
      <div className="text-sm">
        <span className="font-mono">#{upeg.id}</span>
        <span className="ml-2 text-zinc-400">rank {upeg.rank}</span>
      </div>
      {isBichrome && (
        <span className="rounded-full border border-emerald-700 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Bichrome
        </span>
      )}
    </div>
  );
}
