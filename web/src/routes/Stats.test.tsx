import { render, screen } from "@testing-library/react";
import { Stats } from "./Stats";
import type { DataBundle } from "../types";

const bundle: DataBundle = {
  upegs: { generated_at: "x", block: 100, total_minted: 5, items: [] },
  stats: { total_minted: 5, trait_frequencies: { color: { red: 3, blue: 2 } } },
  meta: { generated_at: "x", block: 100, total_minted: 5, data_hash: "h" },
  byId: new Map(),
  byOwner: new Map(),
};

test("renders heading and category", () => {
  render(<Stats bundle={bundle} />);
  expect(screen.getByText(/5 minted as of block 100/)).toBeInTheDocument();
  expect(screen.getByText("color")).toBeInTheDocument();
});
