export interface Upeg {
  id: number;
  owner: string;
  traits: Record<string, string | number>;
  score: number;
  rank: number;
  svg: string;  // Populated client-side from svgs.json after merging
}

export interface UpegsFile {
  generated_at: string;
  block: number;
  total_minted: number;
  items: Omit<Upeg, "svg">[];  // SVG comes from svgs.json
}

// New
export type SvgsFile = Record<string, string>;  // { "1": "<svg/>", ... }

export interface StatsFile {
  total_minted: number;
  trait_frequencies: Record<string, Record<string, number>>;
}

export interface MetaFile {
  generated_at: string;
  block: number;
  total_minted: number;
  data_hash: string;
}

export interface DataBundle {
  upegs: UpegsFile;
  stats: StatsFile;
  meta: MetaFile;
  byId: Map<number, Upeg>;
  byOwner: Map<string, Upeg[]>;
}
