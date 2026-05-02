import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

type SortKey = "nft_count" | "unbound" | "address";

export function Holders({ bundle }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nft_count");

  const holders = bundle.holders?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = holders;
    if (q) {
      list = list.filter((h) => h.address.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sortKey === "nft_count") sorted.sort((a, b) => b.nft_count - a.nft_count || b.unbound - a.unbound);
    if (sortKey === "unbound") sorted.sort((a, b) => b.unbound - a.unbound);
    if (sortKey === "address") sorted.sort((a, b) => a.address.localeCompare(b.address));
    return sorted;
  }, [holders, query, sortKey]);

  if (!bundle.holders) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card>
          <CardContent className="p-6 text-zinc-400">
            Holder data not yet available. The next pipeline run will produce it.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-5xl flex-1 p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-bold">Holders</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {bundle.holders.total_holders.toLocaleString()} holders &middot;{" "}
          {bundle.holders.total_nfts.toLocaleString()} NFTs &middot;{" "}
          {(bundle.holders.total_unbound ?? bundle.holders.total_fractional ?? 0).toFixed(2)} uPEG of unbound balance (not bound to any NFT)
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          &ldquo;Unbound&rdquo; = uPEG token balance that isn&rsquo;t bound to an NFT. Sub-1 dust is normal. Values &ge; 1 mean the v4 hook minted token without minting an NFT for that share — the token still counts toward your balance, just no NFT was crystallized.
        </p>
      </header>

      <div className="mb-3 flex gap-2">
        <Input
          placeholder="Search address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-zinc-900 border-zinc-700"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
        >
          <option value="nft_count">Sort: NFT count</option>
          <option value="unbound">Sort: Unbound balance</option>
          <option value="address">Sort: Address</option>
        </select>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)] rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-border">
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-right">NFTs</th>
              <th className="p-3 text-right">Unbound</th>
              <th className="p-3 text-right">Total Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.address} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                <td className="p-3 font-mono text-zinc-300">
                  <Link to={`/holder/${h.address}`} className="hover:text-emerald-400">
                    {h.address.slice(0, 10)}&hellip;{h.address.slice(-6)}
                  </Link>
                </td>
                <td className="p-3 text-right font-mono">
                  {h.nft_count > 0 ? (
                    <Badge variant={h.nft_count >= 10 ? "default" : "outline"} className={h.nft_count >= 10 ? "bg-emerald-700 hover:bg-emerald-700" : ""}>
                      {h.nft_count}
                    </Badge>
                  ) : (
                    <span className="text-zinc-600">0</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono">
                  {h.unbound > 0 ? (
                    <span className={h.unbound >= 1 ? "text-amber-400" : "text-zinc-400"}>
                      {h.unbound.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono text-zinc-300">{h.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
