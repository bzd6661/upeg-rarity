import type { Upeg } from "../types";

interface Props {
  upeg: Upeg;
}

export function UpegCard({ upeg }: Props) {
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
    </div>
  );
}
