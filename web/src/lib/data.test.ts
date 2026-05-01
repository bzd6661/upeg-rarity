import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadBundle, indexUpegs, _resetCacheForTests } from "./data";
import type { Upeg, UpegsFile, StatsFile, MetaFile } from "../types";

const mockUpegs: UpegsFile = {
  generated_at: "2026-05-01T00:00:00Z",
  block: 100,
  total_minted: 2,
  items: [
    { id: 1, owner: "0xa", traits: { color: "r" }, score: 2, rank: 1, svg: "<svg/>" },
    { id: 2, owner: "0xb", traits: { color: "b" }, score: 1, rank: 2, svg: "<svg/>" },
  ],
};
const mockStats: StatsFile = { total_minted: 2, trait_frequencies: { color: { r: 1, b: 1 } } };
const mockMeta: MetaFile = { generated_at: "2026-05-01T00:00:00Z", block: 100, total_minted: 2, data_hash: "h1" };

function fakeFetch(map: Record<string, unknown>): typeof fetch {
  return (url) =>
    Promise.resolve(new Response(JSON.stringify(map[url as string]), { status: 200 })) as ReturnType<typeof fetch>;
}

describe("indexUpegs", () => {
  it("indexes by id and groups by owner", () => {
    const idx = indexUpegs(mockUpegs.items);
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

  it("fetches and returns a bundle", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    const bundle = await loadBundle();
    expect(bundle.upegs.total_minted).toBe(2);
    expect(bundle.byId.get(1)?.rank).toBe(1);
  });

  it("uses localStorage cache when meta hash matches", async () => {
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    _resetCacheForTests();
    fetchMock.mockClear();
    // Second load: meta still h1, should reuse cached upegs/stats
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/meta.json");
    expect(calledUrls).not.toContain("/upegs.json");
  });

  it("invalidates cache when meta hash changes", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    await loadBundle();
    _resetCacheForTests();
    const newMeta = { ...mockMeta, data_hash: "h2" };
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": newMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/upegs.json");
  });
});
