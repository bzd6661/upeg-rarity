import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Holder } from "./Holder";
import type { DataBundle } from "../types";

const items = [
  { id: 1, owner: "0xowner", traits: {}, score: 1, rank: 1, svg: "<svg/>" },
  { id: 5, owner: "0xowner", traits: {}, score: 0.5, rank: 9, svg: "<svg/>" },
];
const bundle: DataBundle = {
  upegs: { generated_at: "x", block: 1, total_minted: 2, items },
  stats: { total_minted: 2, trait_frequencies: {} },
  meta: { generated_at: "x", block: 1, total_minted: 2, data_hash: "h" },
  byId: new Map(items.map((i) => [i.id, i])),
  byOwner: new Map([["0xowner", items]]),
};

test("renders count and items for known address", () => {
  render(
    <MemoryRouter initialEntries={["/holder/0xOwner"]}>
      <Routes>
        <Route path="/holder/:addr" element={<Holder bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText(/2 uPEGs/)).toBeInTheDocument();
  expect(screen.getByText("#1")).toBeInTheDocument();
  expect(screen.getByText("#5")).toBeInTheDocument();
});

test("renders empty state for unknown address", () => {
  render(
    <MemoryRouter initialEntries={["/holder/0xnobody"]}>
      <Routes>
        <Route path="/holder/:addr" element={<Holder bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText(/No uPEGs/)).toBeInTheDocument();
});
