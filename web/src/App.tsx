import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { loadBundle } from "./lib/data";
import { Ranking } from "./routes/Ranking";
import { Detail } from "./routes/Detail";
import { Holder } from "./routes/Holder";
import { Stats } from "./routes/Stats";
import type { DataBundle } from "./types";

export default function App() {
  const [bundle, setBundle] = useState<DataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBundle().then(setBundle).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">uPEG Rarity</Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link to="/" className="hover:text-zinc-100">Ranking</Link>
          <Link to="/stats" className="hover:text-zinc-100">Stats</Link>
        </nav>
      </header>
      {error && <p className="text-red-400">Failed to load data: {error}</p>}
      {!bundle && !error && <p className="text-zinc-400">Loading…</p>}
      {bundle && (
        <Routes>
          <Route path="/" element={<Ranking bundle={bundle} />} />
          <Route path="/upeg/:id" element={<Detail bundle={bundle} />} />
          <Route path="/holder/:addr" element={<Holder bundle={bundle} />} />
          <Route path="/stats" element={<Stats bundle={bundle} />} />
        </Routes>
      )}
    </div>
  );
}
