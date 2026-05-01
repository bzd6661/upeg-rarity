import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Upeg } from "../types";

interface Props {
  upeg: Upeg;
}

export function UpegCard({ upeg }: Props) {
  const isBichrome = upeg.traits.n_distinct_colors === 2;
  const isTop10 = upeg.rank <= 10;
  return (
    <Card
      className={`overflow-hidden transition-colors hover:border-emerald-700/60 ${
        isTop10 ? "border-emerald-800" : ""
      }`}
    >
      <CardContent className="flex flex-col items-center gap-2 p-3">
        <div
          className="aspect-square w-full [image-rendering:pixelated]"
          dangerouslySetInnerHTML={{ __html: upeg.svg }}
        />
        <div className="flex w-full items-center justify-between text-sm">
          <span className="font-mono font-semibold text-zinc-100">
            #{upeg.id}
          </span>
          <span
            className={`font-mono text-xs ${
              isTop10 ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            rank {upeg.rank}
          </span>
        </div>
        {isBichrome && (
          <Badge className="bg-emerald-700 hover:bg-emerald-700 text-[10px]">
            Bichrome
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
