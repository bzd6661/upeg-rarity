import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Detail } from "./Detail";
import type { DataBundle } from "../types";

const item = { id: 7, owner: "0xowner", traits: { color: "red" }, score: 1.5, rank: 3, svg: "<svg/>" };
const bundle: DataBundle = {
  upegs: { generated_at: "x", block: 1, total_minted: 1, items: [item] },
  stats: { total_minted: 1, trait_frequencies: { color: { red: 1 } } },
  meta: { generated_at: "x", block: 1, total_minted: 1, data_hash: "h" },
  byId: new Map([[7, item]]),
  byOwner: new Map(),
};

test("renders id, rank, holder", () => {
  render(
    <MemoryRouter initialEntries={["/upeg/7"]}>
      <Routes>
        <Route path="/upeg/:id" element={<Detail bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText("uPEG #7")).toBeInTheDocument();
  expect(screen.getByText(/Rank 3/)).toBeInTheDocument();
  expect(screen.getByText("0xowner")).toBeInTheDocument();
});

test("renders not-found when id missing", () => {
  render(
    <MemoryRouter initialEntries={["/upeg/9999"]}>
      <Routes>
        <Route path="/upeg/:id" element={<Detail bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText(/not found/)).toBeInTheDocument();
});
