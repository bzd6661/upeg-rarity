import type { Upeg } from "../types";

/** filter shape: {trait_type: [allowed values]}.
 * AND across keys, OR within values. Empty value list for a key = no filter on that key. */
export type TraitFilter = Record<string, string[]>;

export function applyFilters(items: Upeg[], filter: TraitFilter): Upeg[] {
  const entries = Object.entries(filter).filter(([, vs]) => vs.length > 0);
  if (entries.length === 0) return items;
  return items.filter((item) =>
    entries.every(([key, allowed]) => allowed.includes(String(item.traits[key])))
  );
}

export function sortByRank(items: Upeg[]): Upeg[] {
  return [...items].sort((a, b) => a.rank - b.rank);
}

export function searchById(items: Upeg[], query: string): Upeg | null {
  const id = Number.parseInt(query, 10);
  if (!Number.isFinite(id)) return null;
  return items.find((i) => i.id === id) ?? null;
}
