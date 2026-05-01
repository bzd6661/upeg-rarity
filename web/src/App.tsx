import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { loadBundle } from "./lib/data";
import { Ranking } from "./routes/Ranking";
import { Detail } from "./routes/Detail";
import { Holder } from "./routes/Holder";
import { Stats } from "./routes/Stats";
import { Sets } from "./routes/Sets";
import { SetDetail } from "./routes/SetDetail";
import type { DataBundle } from "./types";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-b-2 border-emerald-500 text-emerald-400"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString();
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
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🦄</span>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-100">uPEG Rarity</span>
              {bundle && (
                <span className="ml-2 text-xs text-zinc-500">
                  {formatNumber(bundle.meta.total_minted)} uPEGs · block {formatNumber(bundle.meta.block)}
                </span>
              )}
            </div>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/">Ranking</NavLink>
            <NavLink to="/sets">Sets</NavLink>
            <NavLink to="/stats">Stats</NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-red-400">
            Failed to load data: {error}
          </div>
        )}
        {!bundle && !error && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
              <span className="text-sm">Loading…</span>
            </div>
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

      {/* Footer */}
      {bundle && (
        <footer className="border-t border-zinc-900 py-4 text-center text-xs text-zinc-600">
          Updated {formatDate(bundle.meta.generated_at)}
        </footer>
      )}
    </div>
  );
}
