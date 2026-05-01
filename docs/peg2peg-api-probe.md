# peg2peg.app API Probe — Findings

**Date:** 2026-05-01  
**Contract:** `0x44b28991B167582F18BA0259e0173176ca125505` (Ethereum mainnet)  
**Collection slug on peg2peg:** `unipeg`

---

## Summary

**peg2peg.app exposes no public API.** Every endpoint on the domain — including static assets,
`/robots.txt` neighbours, REST guesses, GraphQL, and `/api/*` paths — returns HTTP 403 from
Cloudflare with no body. The block is applied to the WebFetch/crawler user-agent blanket-wide;
the `robots.txt` explicitly lists `ClaudeBot: Disallow /`.

However, the investigation surfaced a crucial architectural fact: **uPEG is an ERC-20 token, not
an ERC-721/1155 NFT.** Total supply is exactly 10,000 units (each with a unique on-chain "seed"),
built on Uniswap v4 hooks. peg2peg.app is a peer-to-peer order-book overlay; the underlying
*price signal* lives on Uniswap liquidity pools, not in a traditional NFT listing database.
Accordingly, **"which uPEG are listed for sale at what price"** is not a single REST call — it
maps to: (a) the AMM spot price across multiple Uniswap v3/v4 pools, and (b) any off-chain
peer-to-peer orders that peg2peg stores privately.

For the price component, **DexScreener's public API (no API key required) works perfectly** and
returns live price, volume, and liquidity for every uPEG pool. CoinGecko's free tier also returns
the token price by contract address. Neither provides individual-unit listing data (i.e. "upeg
#4712 is offered at 0.8 ETH"), because that is peg2peg-proprietary order-book data behind
Cloudflare.

Integration feasibility: **YES for spot price and AMM market data; NO for peg2peg-specific
individual listings without scraping or an official API key.**

---

## What peg2peg.app uses internally

- Cannot be determined from HTML — the page itself returns 403.
- `robots.txt` (the only document that responded) shows it is a standard web app with Cloudflare
  protection enabled. No Next.js build IDs, no GraphQL hints, no inline data was accessible.
- Based on the ERC-20-as-NFT architecture (Uniswap v4 hooks contract), it is likely peg2peg
  maintains its own off-chain order database rather than relying on Reservoir/OpenSea indexers,
  because ERC-20 tokens are not indexed by standard NFT APIs.

---

## Endpoints tested and results

| URL | Result |
|-----|--------|
| `https://peg2peg.app/collections/unipeg` | 403 (Cloudflare) |
| `https://peg2peg.app/api/listings?collection=unipeg` | 403 |
| `https://peg2peg.app/api/v1/collections/unipeg/listings` | 403 |
| `https://peg2peg.app/api/v1/listings` | 403 |
| `https://peg2peg.app/api/v2/listings?collection=unipeg` | 403 |
| `https://peg2peg.app/api/orders/asks?collection=unipeg` | 403 |
| `https://peg2peg.app/api/orders?collection=unipeg&status=active` | 403 |
| `https://peg2peg.app/api/tokens/unipeg` | 403 |
| `https://peg2peg.app/api/v1/tokens?collection=unipeg&listed=true` | 403 |
| `https://peg2peg.app/api/v1/upegs?listed=true` | 403 |
| `https://peg2peg.app/api/upegs/listed` | 403 |
| `https://peg2peg.app/api/marketplace/listings?slug=unipeg` | 403 |
| `https://peg2peg.app/api/v1/offers?collection=unipeg&type=ask` | 403 |
| `https://peg2peg.app/api/collection/unipeg` | 403 |
| `https://peg2peg.app/graphql` | 403 |
| `https://peg2peg.app/api-docs` | 403 |
| `https://peg2peg.app/swagger.json` | 403 |
| `https://peg2peg.app/openapi.json` | 403 |
| `https://peg2peg.app/robots.txt` | **200 — content returned** |
| `https://peg2peg.app/sitemap.xml` | 403 |
| `https://api.peg2peg.app/` | ECONNREFUSED (subdomain does not exist) |
| `https://api.reservoir.tools/orders/asks/v5?contracts=0x44b28...` | ECONNREFUSED |
| `https://api.opensea.io/api/v2/listings/collection/unipeg/all` | 401 (API key required) |
| `https://api.dexscreener.com/latest/dex/tokens/0x44b28...` | **200 — full data** |
| `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=0x44b28...` | **200 — full data** |

---

## Endpoints that return data (no auth required)

### 1. DexScreener — all trading pairs for the uPEG contract

```
GET https://api.dexscreener.com/latest/dex/tokens/0x44b28991b167582f18ba0259e0173176ca125505
```

Returns all Uniswap pools containing uPEG. Example response excerpt (1 of 21 pairs):

```json
{
  "schemaVersion": "1.0.0",
  "pairs": [
    {
      "chainId": "ethereum",
      "dexId": "uniswap",
      "labels": ["v4"],
      "pairAddress": "0x94af294207a2c592c08a39c82a7df42a18613d986eeb520b7164fe9ccd66a000",
      "baseToken": {
        "address": "0x44b28991B167582F18BA0259e0173176ca125505",
        "name": "Unipeg",
        "symbol": "uPEG"
      },
      "quoteToken": {
        "address": "0x0000000000000000000000000000000000000000",
        "name": "Ether",
        "symbol": "ETH"
      },
      "priceNative": "0.7130",
      "priceUsd": "1626.45",
      "volume": {
        "h24": 2443060.92,
        "h6": 1381562.30,
        "h1": 115298.62,
        "m5": 18703.91
      },
      "liquidity": {
        "usd": 961556.26,
        "base": 328.61,
        "quote": 187.24
      },
      "txns": {
        "h24": { "buys": 1455, "sells": 1638 }
      },
      "priceChange": {
        "h24": 91.43,
        "h6": 29.12
      }
    }
  ]
}
```

No API key required. Rate limits are undocumented but generous for polling (at least 1 req/sec
observed without throttling).

### 2. DexScreener — specific pair lookup

```
GET https://api.dexscreener.com/latest/dex/pairs/ethereum/{pairAddress}
```

Example:
```
GET https://api.dexscreener.com/latest/dex/pairs/ethereum/0x94af294207a2c592c08a39c82a7df42a18613d986eeb520b7164fe9ccd66a000
```

Returns the same schema as above for that single pool.

### 3. CoinGecko free tier — spot price only

```
GET https://api.coingecko.com/api/v3/simple/token_price/ethereum
    ?contract_addresses=0x44b28991b167582f18ba0259e0173176ca125505
    &vs_currencies=eth,usd
    &include_market_cap=true
    &include_24hr_vol=true
```

Response:
```json
{
  "0x44b28991b167582f18ba0259e0173176ca125505": {
    "eth": 0.68759466,
    "usd": 1567.66,
    "eth_market_cap": 6837.34,
    "usd_market_cap": 15588032.0,
    "eth_24h_vol": 7780.66,
    "usd_24h_vol": 17739261.65
  }
}
```

No API key required. Aggregated price only — does not expose individual unit listings.

---

## Recommended integration path

**Use DexScreener as the primary price oracle.** It is free, no sign-up required, returns
real-time AMM price across all 21 uPEG pools, and the JSON schema is stable. The most liquid
pool to track is the Uniswap v4 uPEG/ETH pair:

```
pairAddress: 0x94af294207a2c592c08a39c82a7df42a18613d986eeb520b7164fe9ccd66a000
```

Implement like this (Python pseudocode):

```python
import requests

DEXSCREENER_URL = (
    "https://api.dexscreener.com/latest/dex/tokens/"
    "0x44b28991b167582f18ba0259e0173176ca125505"
)

def get_upeg_price():
    r = requests.get(DEXSCREENER_URL, timeout=10)
    r.raise_for_status()
    pairs = r.json()["pairs"]
    # Sort by liquidity, take most liquid pair
    best = max(pairs, key=lambda p: p["liquidity"]["usd"])
    return {
        "pair": best["pairAddress"],
        "price_usd": float(best["priceUsd"]),
        "price_eth": float(best["priceNative"]),
        "volume_24h": best["volume"]["h24"],
        "liquidity_usd": best["liquidity"]["usd"],
    }
```

**For individual peg2peg listing data** (which specific token IDs are offered at what price):
this data does not appear to be publicly accessible without browser scraping or a private
peg2peg API key. The only path to get it is:
1. Contact peg2peg team for API access (no public developer docs found).
2. Use a headless browser (Playwright/Selenium) against `peg2peg.app/collections/unipeg`
   with a real browser user-agent (Cloudflare blocks automated crawlers but passes browsers).
3. Monitor Ethereum events on-chain — if peg2peg listings are stored as on-chain transactions
   on the uPEG contract or a companion escrow contract, events could be queried directly.

---

## Open questions

1. **Does peg2peg have a private API or developer program?** No documentation found via GitHub,
   Swagger, or robots.txt. The team should be contacted directly (Twitter: `@unipegv4` /
   Telegram: `t.me/unipeglive`).

2. **Are peg2peg listings stored on-chain?** If the peg2peg escrow/listing contract is known,
   its events can be queried via Etherscan or an Ethereum node with no key required. The GitHub
   repo `ChainCreators/Upeg` has `library/`, `token/`, and `upegs_hook/` directories but no
   marketplace contract visible in public source.

3. **Rate limits for DexScreener.** No published rate limit. Monitor for 429 responses when
   polling frequently (e.g., sub-5-second intervals).

4. **CoinGecko API key.** Free tier works but is rate-limited to ~30 calls/minute. For higher
   frequency, a CoinGecko Pro key costs $129/month. DexScreener is the better free alternative.

5. **Reservoir API deprecation.** The Reservoir NFT indexing API appears to have shut down
   (ECONNREFUSED on all endpoints; docs redirect to relay.link). It is not a viable fallback.

---

## Key facts discovered

- Contract: `0x44b28991B167582F18BA0259e0173176ca125505` (Ethereum mainnet, ERC-20)
- Token: uPEG, 10,000 total supply, 18 decimals
- Not a standard ERC-721/1155 NFT — a "new kind of on-chain object" per the project
- Built on Uniswap v4 hooks; primary price discovery is via AMM pools (not order book)
- 21 Uniswap pools active (v3 and v4), most liquid is the v4 uPEG/ETH pool (~$960k liquidity)
- Current price: ~$1,580 USD / 0.69 ETH per uPEG (as of 2026-05-01)
- peg2peg.app is entirely behind Cloudflare WAF; no endpoint is accessible to automated HTTP clients
