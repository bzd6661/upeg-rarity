import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Stats({ bundle }: Props) {
  const total = bundle.stats.total_minted;
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold">Collection Stats</h2>
        <p className="mt-1 text-zinc-400">
          {total} minted as of block {bundle.meta.block}
        </p>
      </header>
      {Object.entries(bundle.stats.trait_frequencies).map(([cat, vals]) => {
        const data = Object.entries(vals)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
        return (
          <section key={cat}>
            <h3 className="mb-2 text-lg font-semibold capitalize">{cat}</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 24)}>
              <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" stroke="#71717a" />
                <YAxis dataKey="value" type="category" stroke="#71717a" width={80} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        );
      })}
    </div>
  );
}
