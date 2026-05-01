import { describe, it, expect } from "vitest";
import { applyFilters, sortByRank, searchById } from "./filters";
import type { Upeg } from "../types";

const items: Upeg[] = [
  { id: 1, owner: "0xa", traits: { color: "red", layer: "sky" }, score: 5, rank: 1, svg: "" },
  { id: 2, owner: "0xb", traits: { color: "blue", layer: "sky" }, score: 4, rank: 2, svg: "" },
  { id: 3, owner: "0xc", traits: { color: "red", layer: "ground" }, score: 3, rank: 3, svg: "" },
];

describe("applyFilters", () => {
  it("returns all items when no filters", () => {
    expect(applyFilters(items, {})).toHaveLength(3);
  });
  it("AND across trait categories, OR within", () => {
    const result = applyFilters(items, { color: ["red"] });
    expect(result.map((i) => i.id)).toEqual([1, 3]);
    const result2 = applyFilters(items, { color: ["red"], layer: ["sky"] });
    expect(result2.map((i) => i.id)).toEqual([1]);
    const result3 = applyFilters(items, { color: ["red", "blue"] });
    expect(result3.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("sortByRank", () => {
  it("sorts ascending (rank 1 first)", () => {
    const shuffled = [items[2], items[0], items[1]];
    expect(sortByRank(shuffled).map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("searchById", () => {
  it("returns exact id match", () => {
    expect(searchById(items, "2")?.id).toBe(2);
  });
  it("returns null for invalid input", () => {
    expect(searchById(items, "abc")).toBeNull();
    expect(searchById(items, "999")).toBeNull();
  });
});
