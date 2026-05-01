import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Ranking } from "./Ranking";
import type { DataBundle } from "../types";

const bundle: DataBundle = {
  upegs: {
    generated_at: "x", block: 1, total_minted: 1,
    items: [{ id: 1, owner: "0xa", traits: { color: "red" }, score: 2, rank: 1, svg: "<svg/>" }],
  },
  stats: { total_minted: 1, trait_frequencies: { color: { red: 1 } } },
  meta: { generated_at: "x", block: 1, total_minted: 1, data_hash: "h" },
  byId: new Map([[1, { id: 1, owner: "0xa", traits: { color: "red" }, score: 2, rank: 1, svg: "<svg/>" }]]),
  byOwner: new Map(),
};

test("renders count and the single item", () => {
  render(
    <MemoryRouter>
      <Ranking bundle={bundle} />
    </MemoryRouter>
  );
  expect(screen.getByText(/Showing 1 of 1/)).toBeInTheDocument();
});
