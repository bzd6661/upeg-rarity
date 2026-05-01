# upeg-rarity Design Doc

**Date:** 2026-05-01
**Status:** Draft for review
**Author:** brainstormed with Claude

## 1. Goal

Build a public website that lets the uPEG community look up rarity rankings, browse traits, and search by holder address — comparable to a simplified `rarity.tools`, but for [Unipeg (uPEG)](https://etherscan.io/address/0x44b28991b167582f18ba0259e0173176ca125505): a hybrid ERC-20 / on-chain-NFT collection on Uniswap v4 Hooks where each integer-unit balance binds a unique 24×24 SVG unicorn.

**Hard constraints:**
- **Zero hosting cost.** Static site on Cloudflare Pages free tier.
- **No paid RPC required.** Public free RPCs only (Ankr, Llama, cloudflare-eth) with rotation + retry. Paid Alchemy/Infura key is supported but not required.
- **Public-facing**, must scale to community traffic without ongoing per-request cost (CDN-cacheable static assets).

## 2. Non-Goals (YAGNI)

- ❌ User accounts, login, or any write-side features
- ❌ Trading / listing integration (link out to OpenSea/Uniswap, don't embed)
- ❌ Live price feed beyond a single optional uPEG/ETH spot quote on the homepage
- ❌ Real-time updates (sub-minute refresh). Hourly refresh is the SLA.
- ❌ Mobile native apps. Responsive web only.
- ❌ Multi-chain or multi-collection support. uPEG only.
- ❌ Server-side rendering. Pure static.

## 3. Architecture

```
                    GitHub Actions (cron: hourly)
                              │
                              ▼
                    Python data pipeline
                  ┌─────────────────────────┐
                  │ 1. Scan Transfer events │
                  │    (web3.py, public RPC │
                  │     rotation + retry)   │
                  │ 2. For each minted ID:  │
                  │    - call view fn(s) to │
                  │      extract traits     │
                  │    - cache tokenURI/SVG │
                  │ 3. Compute OpenRarity   │
                  │    scores + ranks       │
                  │ 4. Emit JSON artifacts  │
                  └─────────────────────────┘
                              │
                              ▼
                    data/upegs.json (~3–6 MB)
                    data/stats.json
                    data/meta.json
                              │
                              ▼ git commit & push
                              │
                    Cloudflare Pages build
                              │
                              ▼
                    Vite + React static SPA
                  ┌─────────────────────────┐
                  │ - / (ranking table)     │
                  │ - /upeg/:id (detail)    │
                  │ - /holder/:addr         │
                  │ - /stats (distribution) │
                  │ All filter/sort done    │
                  │ client-side in memory   │
                  └─────────────────────────┘
                              │
                              ▼
                    upeg-rarity.pages.dev
```

## 4. Components

### 4.1 Python data pipeline (`pipeline/`)

**Responsibility:** Read on-chain state → produce JSON artifacts.

Sub-modules:
- `pipeline/rpc.py` — RPC client wrapper. Round-robin across configured public RPCs, exponential backoff on rate-limit, fail-fast after N retries. Reads `RPC_URLS` env var (comma-separated) with sensible defaults.
- `pipeline/scan.py` — Pulls Transfer events from contract since last-scanned block (state cached in `data/_state.json`). Identifies which token IDs have been minted.
- `pipeline/traits.py` — For each minted ID, extracts traits. **Implementation chosen at Phase 0 (see §7)**: most likely calls `tokenURI(id)` → decodes base64 JSON → reads `attributes`, OR parses on-chain SVG when no JSON metadata is exposed.
- `pipeline/rarity.py` — Implements OpenRarity ([Information Content algorithm](https://github.com/ProjectOpenSea/open-rarity)). Outputs `score` (float) + `rank` (int) per token.
- `pipeline/emit.py` — Writes `data/upegs.json`, `data/stats.json`, `data/meta.json`. Holder→tokenIds index is derived client-side from `upegs.json[].owner` to avoid duplication and drift.
- `pipeline/__main__.py` — Entry point. Single `python -m pipeline` runs the full cycle.

**Inputs:** RPC URLs (env), contract address (constant), last-scanned block (state file).
**Outputs:** `upegs.json`, `stats.json`, `meta.json`, plus updated `_state.json`.
**Failure modes:** RPC unreachable → exit non-zero, GitHub Actions step fails, no commit happens, site keeps serving last-good data.

### 4.2 Frontend (`web/`)

**Stack:** Vite + React + TypeScript + Tailwind CSS + Recharts. No UI component library, no state management library (React state + URL params suffice at this size).

Routes (React Router):
- `/` — Sortable/filterable ranking table. Default sort: rank asc. Filters: trait checkboxes per category. Search box: token ID exact match. Pagination: virtualized list (10k rows OK with `react-window`).
- `/upeg/:id` — Single-NFT detail. Big SVG, full trait list with each trait's frequency + rarity contribution, current holder address (links to /holder/:addr).
- `/holder/:addr` — Lists all uPEGs owned by that address with thumbnails.
- `/stats` — Trait distribution charts (one bar chart per trait category) + collection summary (total minted, mint rate over time).

**Data loading:** On first route hit, fetch `upegs.json` (~5MB gzipped to ~1MB). Cache in `localStorage` keyed by content hash from `meta.json`. Subsequent navigation is instant.

**SVG rendering:** Each token's SVG is stored inline in `upegs.json` (small — 24×24 SVG is ~1KB compressed). No on-demand RPC calls from the browser.

### 4.3 GitHub Actions workflow (`.github/workflows/refresh.yml`)

- Trigger: `schedule: cron '0 * * * *'` (hourly) + `workflow_dispatch` (manual trigger button).
- Steps:
  1. Checkout repo
  2. Setup Python, install `pipeline/` deps
  3. Run `python -m pipeline`
  4. If `data/` changed → commit + push to `main`
- Cloudflare Pages auto-rebuilds on push.

## 5. Data Flow

**Pipeline run (hourly):**
1. Load `data/_state.json` → get `last_scanned_block`.
2. Query latest block → loop `eth_getLogs` in 5k-block chunks for the contract's Transfer topic.
3. Collect set of token IDs that have ever been transferred (= ever minted) plus current owner per ID.
4. For each ID seen: if not already in `data/upegs.json` cache, fetch traits via `tokenURI()` (or fallback method per Phase 0 outcome). Cache result keyed by ID — traits are immutable once minted.
5. Recompute OpenRarity scores across the full set (frequencies change as new IDs appear, so all scores recompute).
6. Emit `upegs.json`, `stats.json`, `meta.json`, `_state.json`.

**Browser load:**
1. SPA boots → fetches `meta.json` (small, holds build timestamp + asset hashes).
2. Fetches `upegs.json`, parses, indexes by `id` and by `owner`.
3. Renders current route from in-memory data. All filtering/sorting/searching is client-side.

## 6. JSON Schemas

**`data/upegs.json`**
```json
{
  "generated_at": "2026-05-01T12:00:00Z",
  "block": 22481234,
  "total_minted": 7821,
  "items": [
    {
      "id": 1,
      "owner": "0xabc...",
      "traits": { "color": "rainbow", "layer": "celestial", "...": "..." },
      "score": 142.7,
      "rank": 3,
      "svg": "<svg>...</svg>"
    }
  ]
}
```

**`data/stats.json`** — trait frequency tables + per-trait rarity contribution.

**`data/meta.json`** — `{ "generated_at", "block", "total_minted", "data_hash" }`. Tiny file, hit first by the SPA so it can decide whether to invalidate cached `upegs.json`.

**Holder index is NOT a separate file** — derived client-side at boot by walking `upegs.json[].owner` once into a `Map<address, tokenId[]>`. Avoids duplication and any drift between the two files.

## 7. Phase 0: Contract Reverse-Engineering (TIMEBOX 2 HOURS)

**Risk:** We have not yet confirmed how to extract structured traits from the contract. Three scenarios:

| Scenario | Detection | Plan |
|---|---|---|
| **A. Best case** | Contract exposes `tokenURI(id)` returning base64 JSON with `attributes[]` | Decode in `pipeline/traits.py`. Standard path. |
| **B. Medium** | Only on-chain SVG, no structured JSON. Traits encoded as colored pixel groups / layer ordering | Write a minimal SVG parser that extracts the discrete trait values from known pixel coordinates / fill colors. |
| **C. Worst** | Traits live entirely inside hashed state, no view function exposes them; reverse-engineering requires reading bytecode | **STOP and re-brainstorm with user.** Options: (1) ship with reduced trait coverage (only what's externally visible), (2) abandon trait-level rarity and rank by `tokenId` ordinal alone, (3) defer until a community indexer surfaces. |

**Phase 0 deliverables:**
- A short note (`docs/phase0-findings.md`) recording: which scenario applies, sample tokenURI output, and a worked example of trait extraction for token #1.
- This determines whether implementation proceeds normally or blocks for re-design.

**Hard rule:** No further implementation work begins until Phase 0 concludes.

## 8. Tech Stack Summary

| Layer | Choice | Why |
|---|---|---|
| Backend / data | Python 3.11 + `web3.py` | Matches user's existing crypto-research toolkit; best library for this. |
| Rarity algorithm | OpenRarity (Information Content) | OpenSea-endorsed standard, handles sparse traits better than naive Σ(1/freq). |
| Frontend build | Vite + React 18 + TypeScript | Lightweight, fast HMR, type safety pays off in trait-handling code. |
| Styling | Tailwind CSS | No component-library bloat, keeps CSS bundle <30KB. |
| Charts | Recharts | React-native, declarative, ~80KB gzipped. |
| Routing | React Router v6 | Standard. |
| Virtualized list | react-window | 10k-row table without lag. |
| Hosting | Cloudflare Pages (free tier) | 0 cost, global CDN, unlimited bandwidth. |
| Scheduler | GitHub Actions cron | 0 cost up to 2000 min/month; we'll use ~30 min. |
| Domain | `upeg-rarity.pages.dev` | Default Cloudflare subdomain for v1. |

## 9. Project Structure

```
upeg-rarity/
├── README.md
├── .github/workflows/refresh.yml
├── pipeline/
│   ├── __init__.py
│   ├── __main__.py
│   ├── rpc.py
│   ├── scan.py
│   ├── traits.py
│   ├── rarity.py
│   └── emit.py
├── pipeline/tests/
│   ├── test_rpc_rotation.py
│   ├── test_traits_decoding.py
│   └── test_rarity_correctness.py
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/
│       │   ├── Ranking.tsx
│       │   ├── Detail.tsx
│       │   ├── Holder.tsx
│       │   └── Stats.tsx
│       ├── lib/
│       │   ├── data.ts          # JSON fetch + cache
│       │   └── filters.ts       # Sort/filter pure functions
│       └── components/
│           ├── UpegCard.tsx
│           ├── TraitChip.tsx
│           └── RankTable.tsx
├── data/                         # generated, committed
│   ├── upegs.json
│   ├── stats.json
│   ├── meta.json
│   └── _state.json
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-01-upeg-rarity-design.md
├── requirements.txt              # pipeline deps
└── .gitignore
```

## 10. Testing Approach

**Pipeline (Python):**
- `test_rpc_rotation.py` — Mock RPC URLs, verify rotation on rate-limit, retry on transient failure, give-up after configured threshold.
- `test_traits_decoding.py` — Given canned `tokenURI()` outputs (recorded from real contract calls), verify `traits.py` extracts the expected dict. **This locks the Phase 0 decoding logic against regression.**
- `test_rarity_correctness.py` — Hand-computed rarity for a 5-token toy collection vs. `rarity.py` output. Verify Information Content formula is implemented correctly.

**Frontend (TypeScript):**
- Unit-test `lib/filters.ts` (pure functions: sort by rank, filter by trait, search by ID). No React Testing Library needed — keep it tight.
- One smoke test: `App.tsx` renders without crashing given a fixture JSON.

**No e2e/Playwright** — out of scope for v1. Cloudflare Pages preview deploys give human-eyeballed verification.

## 11. Failure & Edge Cases

- **Pipeline RPC outage:** All public RPCs fail simultaneously → cron job exits non-zero, no commit, site keeps serving previous good data. Manual investigation if multiple consecutive runs fail (GitHub Actions emails on failure).
- **Token ID gaps:** uPEG ordinals can have gaps if a holder hasn't crossed an integer threshold. Pipeline only emits IDs that have been observed in Transfer events; never invent IDs.
- **Re-org:** Each pipeline run re-reads from `last_scanned_block - 12` to absorb shallow re-orgs. Trait data is immutable, so re-scan is cheap.
- **Contract upgrade:** Out of scope. If uPEG changes contract address, this is a manual config change.
- **JSON file too large:** Worst case ~10k items × 2KB each = 20MB. Will gzip to ~5MB. If pre-gzip exceeds 25MB (GitHub file size soft warn), shard by ID range. Defer optimization until measured.

## 12. Open Questions for Plan Phase

These do not block design approval but will be resolved in the implementation plan:
- Exact OpenRarity library to use (npm package vs. port the algorithm in Python — likely port, ~50 lines).
- Whether to commit `data/upegs.json` directly to `main` (simple) or use a `data` branch (cleaner history). Default: commit to `main`.
- Cloudflare Pages build command (likely `cd web && npm run build`, output dir `web/dist`).

## 13. Success Criteria

**v1 ships when:**
- ✅ Phase 0 completed with a documented trait-extraction strategy.
- ✅ Pipeline runs end-to-end against mainnet, produces valid JSON.
- ✅ Frontend deployed at `upeg-rarity.pages.dev` and renders all four routes.
- ✅ Hourly cron has run successfully ≥3 times in a row without intervention.
- ✅ All tests in §10 pass in CI.
