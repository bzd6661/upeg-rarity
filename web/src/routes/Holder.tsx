import { Link, useParams } from "react-router-dom";
import { UpegCard } from "../components/UpegCard";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Holder({ bundle }: Props) {
  const { addr } = useParams<{ addr: string }>();
  const norm = (addr ?? "").toLowerCase();
  const items = bundle.byOwner.get(norm) ?? [];

  return (
    <div>
      <h2 className="font-mono text-2xl">{addr}</h2>
      <p className="mt-1 text-zinc-400">{items.length} uPEG{items.length === 1 ? "" : "s"}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-zinc-500">No uPEGs at this address.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {items.map((u) => (
            <Link key={u.id} to={`/upeg/${u.id}`}>
              <UpegCard upeg={u} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
