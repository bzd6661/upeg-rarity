import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Holders } from "./Holders";
import type { DataBundle } from "../types";

const bundle: DataBundle = {
  upegs: { generated_at: "x", block: 1, total_minted: 0, items: [] } as any,
  stats: { total_minted: 0, trait_frequencies: {} },
  meta: { generated_at: "x", block: 1, total_minted: 0, data_hash: "h" },
  holders: {
    generated_at: "x",
    block: 1,
    total_holders: 1,
    total_nfts: 5,
    total_fractional: 0.73,
    items: [{ address: "0xowner", nft_count: 5, fractional: 0.73, balance: "5.7300" }],
  },
  byId: new Map(),
  byOwner: new Map(),
  holderByAddress: new Map([["0xowner", { address: "0xowner", nft_count: 5, fractional: 0.73, balance: "5.7300" }]]),
};

test("renders holders header and one row", () => {
  render(<MemoryRouter><Holders bundle={bundle} /></MemoryRouter>);
  expect(screen.getByText(/1 holders/)).toBeInTheDocument();
  expect(screen.getByText(/0xowner/)).toBeInTheDocument();
});

test("shows empty state when holders not available", () => {
  const noHolders: DataBundle = { ...bundle, holders: undefined, holderByAddress: new Map() };
  render(<MemoryRouter><Holders bundle={noHolders} /></MemoryRouter>);
  expect(screen.getByText(/not yet available/i)).toBeInTheDocument();
});
