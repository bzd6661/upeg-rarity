import type { Upeg } from "../types";

interface Props {
  upeg: Upeg;
}

export function UpegCard({ upeg }: Props) {
  const isBichrome = upeg.traits.n_distinct_colors === 2;
  const isTop10 = upeg.rank <= 10;
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border bg-zinc-900/50 p-3 transition-all duration-150 hover:scale-[1.02] hover:border-emerald-700 hover:shadow-lg ${
        isTop10 ? "border-emerald-800" : "border-zinc-800"
      }`}
    >
      <div
        className="aspect-square w-full [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: upeg.svg }}
      />
      <div className="text-center text-sm">
        <span className="font-mono font-semibold text-zinc-100">#{upeg.id}</span>
        <span
          className={`ml-2 font-mono text-xs ${
            isTop10 ? "text-emerald-400" : "text-zinc-400"
          }`}
        >
          rank {upeg.rank}
        </span>
      </div>
      {isBichrome && (
        <span className="rounded-full border border-emerald-500 bg-emerald-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Bichrome
        </span>
      )}
    </div>
  );
}
