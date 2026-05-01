import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SetDetail } from "./SetDetail";
import type { DataBundle } from "../types";

const bichromeItem = {
  id: 99, owner: "0xa",
  traits: { n_distinct_colors: 2 },
  score: 0, rank: 1, svg: "<svg/>",
};
const bundle: DataBundle = {
  upegs: { generated_at: "x", block: 1, total_minted: 1, items: [bichromeItem] },
  stats: { total_minted: 1, trait_frequencies: {} },
  meta: { generated_at: "x", block: 1, total_minted: 1, data_hash: "h" },
  byId: new Map([[99, bichromeItem]]),
  byOwner: new Map(),
};

test("renders set title and members for known slug", () => {
  render(
    <MemoryRouter initialEntries={["/sets/bichrome"]}>
      <Routes>
        <Route path="/sets/:name" element={<SetDetail bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /Bichrome/ })).toBeInTheDocument();
  expect(screen.getByText(/1 uPEGs/)).toBeInTheDocument();
});

test("renders not-found message for unknown slug", () => {
  render(
    <MemoryRouter initialEntries={["/sets/nonexistent"]}>
      <Routes>
        <Route path="/sets/:name" element={<SetDetail bundle={bundle} />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText(/Unknown set/)).toBeInTheDocument();
});
