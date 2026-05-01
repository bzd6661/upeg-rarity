import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { loadBundle } from "./lib/data";
import { Ranking } from "./routes/Ranking";
import { Detail } from "./routes/Detail";
import { Holder } from "./routes/Holder";
import { Stats } from "./routes/Stats";
import { Sets } from "./routes/Sets";
import { SetDetail } from "./routes/SetDetail";
import type { DataBundle } from "./types";

function navClass({ isActive }: { isActive: boolean }) {
  return `text-sm transition-colors ${
    isActive
      ? "text-emerald-400 border-b-2 border-emerald-400 pb-0.5"
      : "text-zinc-400 hover:text-zinc-100"
  }`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function App() {
  const [bundle, setBundle] = useState<DataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBundle().then(setBundle).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🦄</span>
          <div>
            <div className="text-lg font-bold leading-none">uPEG Rarity</div>
            {bundle && (
              <div className="mt-1 text-[11px] text-zinc-500">
                {bundle.meta.total_minted.toLocaleString()} uPEGs · block{" "}
                {bundle.meta.block.toLocaleString()}
              </div>
            )}
          </div>
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink to="/" end className={navClass}>
            Ranking
          </NavLink>
          <NavLink to="/sets" className={navClass}>
            Sets
          </NavLink>
          <NavLink to="/stats" className={navClass}>
            Stats
          </NavLink>
          <a
            href="https://x.com/tiger_web3"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-700/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:border-emerald-500 hover:bg-emerald-900/50 hover:text-emerald-100"
          >
            <span aria-hidden>𝕏</span>
            <span>Follow</span>
          </a>
        </nav>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {error && (
          <div className="mx-auto max-w-2xl p-8 text-red-400">
            Failed to load data: {error}
          </div>
        )}
        {!bundle && !error && (
          <div className="mx-auto max-w-7xl space-y-3 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {bundle && (
          <Routes>
            <Route path="/" element={<Ranking bundle={bundle} />} />
            <Route path="/upeg/:id" element={<Detail bundle={bundle} />} />
            <Route path="/holder/:addr" element={<Holder bundle={bundle} />} />
            <Route path="/stats" element={<Stats bundle={bundle} />} />
            <Route path="/sets" element={<Sets bundle={bundle} />} />
            <Route path="/sets/:name" element={<SetDetail bundle={bundle} />} />
          </Routes>
        )}
      </main>

      {bundle && (
        <footer className="shrink-0 border-t border-border py-3 text-center text-xs text-zinc-600">
          Updated {formatDate(bundle.meta.generated_at)}
        </footer>
      )}
    </div>
  );
}
