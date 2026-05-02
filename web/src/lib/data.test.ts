import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadBundle, indexUpegs, _resetCacheForTests } from "./data";
import type { Upeg, UpegsFile, StatsFile, MetaFile, SvgsFile, HoldersFile } from "../types";

const mockUpegsRaw: UpegsFile = {
  generated_at: "2026-05-01T00:00:00Z",
  block: 100,
  total_minted: 2,
  items: [
    { id: 1, owner: "0xa", traits: { color: "r" }, score: 2, rank: 1 } as any,
    { id: 2, owner: "0xb", traits: { color: "b" }, score: 1, rank: 2 } as any,
  ],
};
const mockStats: StatsFile = { total_minted: 2, trait_frequencies: { color: { r: 1, b: 1 } } };
const mockMeta: MetaFile = { generated_at: "2026-05-01T00:00:00Z", block: 100, total_minted: 2, data_hash: "h1" };
const mockSvgs: SvgsFile = { "1": "<svg id='1'/>", "2": "<svg id='2'/>" };
const mockHolders: HoldersFile = {
  generated_at: "2026-05-01T00:00:00Z",
  block: 100,
  total_holders: 2,
  total_nfts: 2,
  total_fractional: 0.5,
  items: [
    { address: "0xa", nft_count: 1, fractional: 0.5, balance: "1.5000" },
    { address: "0xb", nft_count: 1, fractional: 0.0, balance: "1.0000" },
  ],
};

function fakeFetch(map: Record<string, unknown>): typeof fetch {
  return (url) => {
    const key = url as string;
    if (key in map) {
      return Promise.resolve(new Response(JSON.stringify(map[key]), { status: 200 })) as ReturnType<typeof fetch>;
    }
    return Promise.resolve(new Response("Not Found", { status: 404 })) as ReturnType<typeof fetch>;
  };
}

describe("indexUpegs", () => {
  it("indexes by id and groups by owner", () => {
    const items: Upeg[] = [
      { id: 1, owner: "0xa", traits: {}, score: 0, rank: 1, svg: "<svg/>" },
      { id: 2, owner: "0xb", traits: {}, score: 0, rank: 2, svg: "<svg/>" },
    ];
    const idx = indexUpegs(items);
    expect(idx.byId.get(1)?.owner).toBe("0xa");
    expect(idx.byOwner.get("0xa")?.length).toBe(1);
    expect(idx.byOwner.get("0xb")?.length).toBe(1);
  });
});

describe("loadBundle", () => {
  beforeEach(() => {
    _resetCacheForTests();
    localStorage.clear();
  });

  it("fetches and merges svgs into items", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      "/holders.json": mockHolders,
    }));
    const bundle = await loadBundle();
    expect(bundle.upegs.total_minted).toBe(2);
    expect(bundle.byId.get(1)?.svg).toBe("<svg id='1'/>");
    expect(bundle.byId.get(2)?.svg).toBe("<svg id='2'/>");
  });

  it("populates holderByAddress map from holders.json", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      "/holders.json": mockHolders,
    }));
    const bundle = await loadBundle();
    expect(bundle.holders?.total_holders).toBe(2);
    expect(bundle.holderByAddress?.get("0xa")?.nft_count).toBe(1);
    expect(bundle.holderByAddress?.get("0xa")?.fractional).toBe(0.5);
    expect(bundle.holderByAddress?.get("0xb")?.balance).toBe("1.0000");
  });

  it("tolerates missing holders.json", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      // /holders.json intentionally absent → fetch returns 404 → caught
    }));
    const bundle = await loadBundle();
    expect(bundle.holders).toBeUndefined();
    expect(bundle.holderByAddress?.size).toBe(0);
  });

  it("uses localStorage cache when meta hash matches", async () => {
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      "/holders.json": mockHolders,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    _resetCacheForTests();
    fetchMock.mockClear();
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/meta.json");
    expect(calledUrls).not.toContain("/upegs.json");
    expect(calledUrls).not.toContain("/svgs.json");
  });

  it("invalidates cache when meta hash changes", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      "/holders.json": mockHolders,
    }));
    await loadBundle();
    _resetCacheForTests();
    const newMeta = { ...mockMeta, data_hash: "h2" };
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": newMeta,
      "/upegs.json": mockUpegsRaw,
      "/stats.json": mockStats,
      "/svgs.json": mockSvgs,
      "/holders.json": mockHolders,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/upegs.json");
    expect(calledUrls).toContain("/svgs.json");
  });
});
