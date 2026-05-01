import type { DataBundle, MetaFile, StatsFile, Upeg, UpegsFile, SvgsFile } from "../types";

const CACHE_KEY = "upeg-rarity:bundle:v2";

interface CacheEntry {
  hash: string;
  upegs: UpegsFile;
  stats: StatsFile;
  svgs: SvgsFile;
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

async function fetchJson<T>(url: string, cacheMode: RequestCache = "default"): Promise<T> {
  const r = await fetch(url, { cache: cacheMode });
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

function mergeSvgs(items: Omit<Upeg, "svg">[], svgs: SvgsFile): Upeg[] {
  return items.map((item) => ({
    ...item,
    svg: svgs[String(item.id)] ?? "",
  }));
}

export async function loadBundle(): Promise<DataBundle> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const meta = await fetchJson<MetaFile>("/meta.json", "no-cache");
    const cached = readCache();
    let upegs: UpegsFile;
    let stats: StatsFile;
    let svgs: SvgsFile;
    if (cached && cached.hash === meta.data_hash) {
      upegs = cached.upegs;
      stats = cached.stats;
      svgs = cached.svgs;
    } else {
      [upegs, stats, svgs] = await Promise.all([
        fetchJson<UpegsFile>("/upegs.json"),
        fetchJson<StatsFile>("/stats.json"),
        fetchJson<SvgsFile>("/svgs.json"),
      ]);
      writeCache({ hash: meta.data_hash, upegs, stats, svgs });
    }
    const merged = mergeSvgs(upegs.items, svgs);
    const { byId, byOwner } = indexUpegs(merged);
    return { upegs: { ...upegs, items: merged } as UpegsFile, stats, meta, byId, byOwner };
  })();
  inFlight.catch(() => { inFlight = null; });
  return inFlight;
}
