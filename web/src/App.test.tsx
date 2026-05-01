import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "./App";

beforeEach(() => {
  const bundle = {
    generated_at: "x", block: 1, total_minted: 0, items: [],
  };
  const stats = { total_minted: 0, trait_frequencies: {} };
  const meta = { generated_at: "x", block: 1, total_minted: 0, data_hash: "h" };
  vi.stubGlobal("fetch", (url: string) => {
    const map: Record<string, unknown> = {
      "/meta.json": meta, "/upegs.json": bundle, "/stats.json": stats,
    };
    return Promise.resolve(new Response(JSON.stringify(map[url])));
  });
});

test("renders header immediately and ranking after load", async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText("uPEG Rarity")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText(/Loading/)).not.toBeInTheDocument());
});
