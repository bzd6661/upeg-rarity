import { Link, useParams } from "react-router-dom";
import { UpegCard } from "../components/UpegCard";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function Holder({ bundle }: Props) {
  const { addr } = useParams<{ addr: string }>();
  const norm = (addr ?? "").toLowerCase();
  const items = bundle.byOwner.get(norm) ?? [];

  return (
    <div>
      <Link
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        to="/"
      >
        ← Back to ranking
      </Link>

      <div className="mt-4">
        <h2 className="font-mono text-2xl font-bold text-zinc-100" title={addr}>
          {truncateAddress(addr ?? "")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {items.length} uPEG{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl" aria-hidden="true">🦄</span>
          <p className="text-zinc-400">No uPEGs at this address.</p>
          <p className="text-sm text-zinc-600">
            The address may be incorrect or hold no uPEGs.
          </p>
          <Link
            to="/"
            className="mt-2 rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Back to ranking
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
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
