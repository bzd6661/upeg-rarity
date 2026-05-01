import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sets } from "./Sets";
import type { DataBundle } from "../types";

const bundle: DataBundle = {
  upegs: {
    generated_at: "x", block: 1, total_minted: 1,
    items: [{
      id: 1, owner: "0xa", traits: { n_distinct_colors: 2 },
      score: 0, rank: 1, svg: "<svg/>",
    }],
  },
  stats: { total_minted: 1, trait_frequencies: {} },
  meta: { generated_at: "x", block: 1, total_minted: 1, data_hash: "h" },
  byId: new Map(),
  byOwner: new Map(),
};

test("renders Notable Sets heading and Bichrome card", () => {
  render(
    <MemoryRouter>
      <Sets bundle={bundle} />
    </MemoryRouter>
  );
  expect(screen.getByText("Notable Sets")).toBeInTheDocument();
  expect(screen.getByText("Bichrome")).toBeInTheDocument();
});
