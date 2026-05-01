import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpegCard } from "../components/UpegCard";
import { getSet, setMembers } from "../lib/sets";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function SetDetail({ bundle }: Props) {
  const { name } = useParams<{ name: string }>();
  const set = name ? getSet(name) : undefined;

  if (!set) {
    return (
      <div className="p-6 text-zinc-400">
        Unknown set: {name}.{" "}
        <Link className="underline" to="/sets">
          Back to all sets
        </Link>
      </div>
    );
  }

  const members = setMembers(set, bundle.upegs.items);
  const pct = (members.length / bundle.upegs.total_minted) * 100;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-7xl p-6">
        <Link to="/sets" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All sets
        </Link>
        <header className="mt-3 mb-6">
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            {set.badge && <span>{set.badge}</span>}
            <span>{set.title}</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-400">{set.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-700/60 bg-emerald-950/30 text-emerald-400 font-mono"
            >
              {members.length} uPEGs
            </Badge>
            <span className="text-xs text-zinc-500">
              ({pct.toFixed(2)}% of collection)
            </span>
          </div>
        </header>

        {members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              No NFTs match this set yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {members.map((u) => (
              <Link key={u.id} to={`/upeg/${u.id}`}>
                <UpegCard upeg={u} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
