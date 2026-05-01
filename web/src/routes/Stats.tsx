import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-zinc-100">{value}</p>
    </div>
  );
}

export function Stats({ bundle }: Props) {
  const total = bundle.stats.total_minted;

  // Derive color-count stats from trait_frequencies
  const colorFreqs = bundle.stats.trait_frequencies["n_distinct_colors"] ?? {};
  const bichrome = colorFreqs["2"] ?? 0;
  const trichrome = colorFreqs["3"] ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold">Collection Stats</h2>
        <p className="mt-1 text-zinc-400">
          {total} minted as of block {bundle.meta.block}
        </p>
      </header>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total minted" value={total.toLocaleString()} />
        {bichrome > 0 && (
          <StatCard label="Bichrome (2-color)" value={bichrome.toLocaleString()} />
        )}
        {trichrome > 0 && (
          <StatCard label="Trichrome (3-color)" value={trichrome.toLocaleString()} />
        )}
        {Object.keys(colorFreqs).length > 0 && (
          <StatCard
            label="Color variants"
            value={Object.keys(colorFreqs).length}
          />
        )}
      </div>

      {/* Per-trait charts */}
      {Object.entries(bundle.stats.trait_frequencies).map(([cat, vals]) => {
        const data = Object.entries(vals)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
        return (
          <section key={cat} className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 px-4 pb-4 pt-3">
            <h3 className="mb-3 text-sm font-semibold capitalize tracking-wide text-zinc-300">{cat}</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 24)}>
              <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis dataKey="value" type="category" stroke="#52525b" width={80} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#e4e4e7" }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Bar dataKey="count" fill="#059669" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        );
      })}
    </div>
  );
}
