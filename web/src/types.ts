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

export interface HolderEntry {
  address: string;
  nft_count: number;       // authoritative count from on-chain enumeration
  unbound: number;         // balance - nft_count (sub-NFT + any "ghost" balance from transferUpeg)
  fractional: number;      // strict sub-1 fractional piece of unbound (legacy field)
  balance: string;         // human-readable total like "5.7320"
}

export interface HoldersFile {
  generated_at: string;
  block: number;
  total_holders: number;
  total_nfts: number;
  total_unbound: number;     // total balance not bound to any NFT, network-wide
  total_fractional?: number; // legacy alias, equal to total_unbound
  items: HolderEntry[];
}

export interface DataBundle {
  upegs: UpegsFile;
  stats: StatsFile;
  meta: MetaFile;
  holders?: HoldersFile;           // optional — pipeline may not have run with holders yet
  byId: Map<number, Upeg>;
  byOwner: Map<string, Upeg[]>;
  holderByAddress?: Map<string, HolderEntry>;  // computed at index time, addr lowercase
}
