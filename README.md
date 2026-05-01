# uPEG Rarity

Public, zero-cost rarity explorer for [Unipeg (uPEG)](https://etherscan.io/address/0x44b28991b167582f18ba0259e0173176ca125505) — a hybrid ERC-20 / on-chain-NFT collection on Uniswap v4 Hooks.

## Architecture

- **Pipeline** (`pipeline/`): Hourly Python job that enumerates uPEG holders, decodes traits via `getSeedData(seed)` on the helper hook contract, computes [OpenRarity](https://github.com/ProjectOpenSea/open-rarity) Information Content scores, and writes JSON to `data/`.
- **Frontend** (`web/`): Vite + React static SPA that loads `data/upegs.json` once and does all filter/sort/search client-side.
- **CI/CD**: GitHub Actions runs the pipeline on cron (`refresh.yml`); Cloudflare Pages auto-deploys the SPA on every push.

## Local dev

```bash
# 1. Pipeline
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest                    # run pipeline tests
python -m pipeline        # produce data/ (15-40 min on first run)

# 2. Frontend
cd web
npm install
npm test -- --run         # run frontend tests
npm run dev               # http://localhost:5173
```

## Deployment

### Cloudflare Pages (one-time setup)

1. Push this repo to GitHub.
2. In Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Select the repo. Build settings:
   - **Framework preset:** None
   - **Build command:** `cd web && npm ci && npm run build`
   - **Build output directory:** `web/dist`
   - **Root directory:** (blank)
4. Deploy. The site will live at `<project-name>.pages.dev`.

### GitHub Actions secrets (optional)

- `RPC_URLS` — comma-separated list of RPC URLs to use (e.g., your private Alchemy/Infura key). Defaults to free public RPCs if unset.

## Testing

```bash
pytest                              # pipeline
cd web && npm test -- --run         # frontend
```

## Data refresh

The hourly cron in `.github/workflows/refresh.yml` runs `python -m pipeline` and commits `data/*.json` if changed. Cloudflare Pages auto-rebuilds on push.

## Contract

- **Main:** `0x44b28991b167582f18ba0259e0173176ca125505` (enumeration)
- **Hook (traits + SVG):** `0xe54082DfBf044B6a8F584bdDdb90a22d5613C440`
- **Trait extraction strategy:** see `docs/phase0-findings.md`
- **Design doc:** `docs/superpowers/specs/2026-05-01-upeg-rarity-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-05-01-upeg-rarity.md`
