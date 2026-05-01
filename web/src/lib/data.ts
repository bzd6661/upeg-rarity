import type { DataBundle, MetaFile, StatsFile, Upeg, UpegsFile } from "../types";

const CACHE_KEY = "upeg-rarity:bundle:v1";

interface CacheEntry {
  hash: string;
  upegs: UpegsFile;
  stats: StatsFile;
}

let inFlight: Promise<DataBundle> | null = null;

export function _resetCacheForTests() {
  inFlight = null;
}

export function indexUpegs(items: Upeg[]) {
  const byId = new Map<number, Upeg>();
  const byOwner = new Map<string, Upeg[]>();
  for (const item of items) {
    byId.set(item.id, item);
    const owner = item.owner.toLowerCase();
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner)!.push(item);
  }
  return { byId, byOwner };
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return (await r.json()) as T;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* quota exceeded — fall back to no cache */
  }
}

export async function loadBundle(): Promise<DataBundle> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const meta = await fetchJson<MetaFile>("/meta.json");
    const cached = readCache();
    let upegs: UpegsFile;
    let stats: StatsFile;
    if (cached && cached.hash === meta.data_hash) {
      upegs = cached.upegs;
      stats = cached.stats;
    } else {
      [upegs, stats] = await Promise.all([
        fetchJson<UpegsFile>("/upegs.json"),
        fetchJson<StatsFile>("/stats.json"),
      ]);
      writeCache({ hash: meta.data_hash, upegs, stats });
    }
    const { byId, byOwner } = indexUpegs(upegs.items);
    return { upegs, stats, meta, byId, byOwner };
  })();
  return inFlight;
}
