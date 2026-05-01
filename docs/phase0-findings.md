# Phase 0 Findings — uPEG Contract Investigation

**Date:** 2026-05-01
**Contract:** 0x44b28991b167582f18ba0259e0173176ca125505
**Helper (imageParams/randomSeedProvider):** 0xe54082DfBf044B6a8F584bdDdb90a22d5613C440
**RPC used:** https://1rpc.io/eth (Nethermind node behind 1rpc aggregator)

## Scenario classification

**Determined scenario:** A (structured on-chain traits — non-standard path, but fully readable)

The contract does not implement `tokenURI`. Instead, trait data is exposed via two
on-chain view functions across two contracts:

1. Main contract `OwnerUpegsPage(owner, page, pageSize)` → array of `UpegSeedData{id, seed}` — enumerate all tokens for a holder.
2. imageParams contract `getSeedData(seed)` → `UpegMetadata` struct with 18 uint8 trait fields — decode any token's full trait vector from its seed.

This is functionally equivalent to Scenario A: one deterministic call per token yields a
complete structured trait record.

## Evidence

### `tokenURI(tokenId)` behavior

**tokenURI reverts unconditionally — Task 4 must NOT call it.**

The probe tested both invalid IDs (1, 2, 100) and the known-valid minted ID 19125. All reverted:

```
tokenURI(1)     [INVALID]     → REVERTED: ('execution reverted', 'no data')
tokenURI(2)     [INVALID]     → REVERTED: ('execution reverted', 'no data')
tokenURI(100)   [INVALID]     → REVERTED: ('execution reverted', 'no data')
tokenURI(19125) [KNOWN-VALID] → REVERTED: ('execution reverted', '0x')
```

ID 19125 is a confirmed minted token (owned by holder index 0; its seed and full trait
vector were successfully read via `OwnerUpeg`). The fact that `tokenURI` also reverts for
it proves the revert is **unconditional** — the function is a stub in the ABI only.

**Implication for Task 4:** Do not call `tokenURI`. The only supported trait-extraction
path is `OwnerUpegsPage` + `getSeedData` (see Implementation Plan below).

### `OwnerUpegsPage` page-index convention

**Page index is 0-based.** Confirmed by probing holder at index 0 (owns 11 upegs):

```
OwnerUpegsPage(holder, page=0, pageSize=5) -> 5 items, ids=[19125, 19126, 19127, 19128, 24517]
OwnerUpegsPage(holder, page=1, pageSize=5) -> 5 items, ids=[31005, 31006, 31007, 31008, 31009]
```

Page 0 returned the first 5 tokens; page 1 returned the next 5. The pseudocode
`range(ceil(upeg_count / page_size))` producing pages `[0, 1, 2, ...]` is correct.

### Probe output (main contract identity)

```
name = Unipeg
symbol = uPEG
UpegsTotalCount = 58812
HoldersCount = 1213
imageParams contract = 0xe54082DfBf044B6a8F584bdDdb90a22d5613C440
randomSeedProvider = 0xe54082DfBf044B6a8F584bdDdb90a22d5613C440
```

### `getImageParams()` — actual on-chain values

```
colorsCount           = 36
backgroundColorsCount = 6
accessoriesCount      = 15
bodyCount             = 1
eyesCount             = 1
hairCount             = 15
hornCount             = 15
legsFrontCount        = 15
legsBackCount         = 15
tailCount             = 15
groundCount           = 0
wingsCount            = 15
```

The findings doc previously stated "6 background colors" and "palette of 36 colors" —
both are confirmed by the live probe above.

### Sample trait extraction for upeg #19125 (seed=2441525982659010410504976999095291821883392)

```
backGroundColor = 0
body = 1
eyes = 1
hair = 0
horn = 0
legsBack = 7
legsFront = 12
wings = 0
tail = 10
accessories = 15
ground = 0
bodyColor = 30
eyesColor = 16
hairColor = 0
hornColor = 0
groundColor = 0
accessoriesColor = 7
tailColor = 28
```

### Other view functions discovered

**Main contract (0x44b28991...):**

- `UpegsTotalCount() → uint256` — total number of upegs minted (58,812 at probe time)
- `HoldersCount() → uint256` — number of unique holders (1,213 at probe time)
- `Holder(index uint256) → address` — enumerate holders by index
- `OwnerUpegsCount(owner address) → uint256` — how many upegs an address holds
- `OwnerUpeg(owner address, index uint256) → UpegSeedData{id, seed}` — get one upeg by owner+index
- `OwnerUpegsPage(owner address, page uint256, pageSize uint256) → UpegSeedData[]` — paginated enumeration of a holder's upegs (0-indexed pages)
- `OwnerOwns(owner address, upegId uint256) → bool` — ownership check
- `imageParams() → address` — returns the imageParams helper contract address
- `randomSeedProvider() → address` — returns the random seed provider address (same as imageParams: 0xe54082...)
- `name() → string` — "Unipeg"
- `symbol() → string` — "uPEG"
- `totalSupply() → uint256` — ERC-20 total supply (10,000 * 10^18, the fungible portion)
- `balanceOf(owner) → uint256` — ERC-20 balance

**imageParams contract (0xe54082...):**

- `getSeedData(seed uint256) → UpegMetadata` — decode seed into full 18-field trait struct (PRIMARY TRAIT EXTRACTION FUNCTION)
- `generate(seed uint256) → string` — returns raw 24x24 SVG for the given seed
- `generateSvg(seedData UpegMetadata) → string` — same as above but takes decoded metadata
- `getImageParams() → ImageParams` — returns the full trait-space configuration struct
- `accessoriesCount() → uint256` — 15
- `bodyCount() → uint256` — 1
- `eyesCount() → uint256` — 1
- `hairCount() → uint256` — 15
- `hornCount() → uint256` — 15
- `legsFrontCount() → uint256` — 15
- `legsBackCount() → uint256` — 15
- `tailCount() → uint256` — 15
- `groundCount() → uint256` — 0
- `wingsCount() → uint256` — 15

### Source verification

- Etherscan source verified: yes (Exact Match, both contracts, Solidity v0.8.33)
- Notable contracts:
  - Main contract: `Unipeg` — ERC-20/NFT hybrid with Uniswap v4 hook integration
  - Helper contract: `UpegHook` at 0xe54082DfBf044B6a8F584bdDdb90a22d5613C440 — serves as both `imageParams` and `randomSeedProvider`; contains all SVG rendering and trait decoding logic

## Trait dimensions identified

All trait values are uint8 indices. The `*Color` fields index into a palette of **36 colors**
(`colorsCount = 36` from `getImageParams()`). Background colors have a separate palette of
**6 entries** (`backgroundColorsCount = 6`). The shape/part fields index into variant arrays.
Index 0 typically means "none" or "default variant 1".

| Trait field | Type | Count | Notes |
|---|---|---|---|
| `backGroundColor` | color index | **6** background colors | `backgroundColorsCount = 6` |
| `body` | shape index | **1** variant | Only one body shape currently (`bodyCount = 1`) |
| `eyes` | shape index | **1** variant | Only one eyes shape currently (`eyesCount = 1`) |
| `hair` | shape index | **15** variants | `hairCount = 15`; value 0 = no hair |
| `horn` | shape index | **15** variants | `hornCount = 15`; value 0 = no horn |
| `legsBack` | shape index | **15** variants | `legsBackCount = 15` |
| `legsFront` | shape index | **15** variants | `legsFrontCount = 15` |
| `wings` | shape index | **15** variants | `wingsCount = 15`; value 0 = no wings |
| `tail` | shape index | **15** variants | `tailCount = 15` |
| `accessories` | shape index | **15** variants | `accessoriesCount = 15`; value 0 = no accessories |
| `ground` | shape index | **0** variants | `groundCount = 0` — not currently used, skip in scoring |
| `bodyColor` | color index | **36** colors | Indexes into full color palette (`colorsCount = 36`) |
| `eyesColor` | color index | **36** colors | Indexes into full color palette |
| `hairColor` | color index | **36** colors | 0 when hair=0 |
| `hornColor` | color index | **36** colors | 0 when horn=0 |
| `groundColor` | color index | **36** colors | Unused (groundCount=0) |
| `accessoriesColor` | color index | **36** colors | 0 when accessories=0 |
| `tailColor` | color index | **36** colors | Tail color |

**Observed sample values across 3 tokens:**
- Upeg #19125: backGroundColor=0, horn=0, wings=0, hair=0, legsBack=7, legsFront=12, tail=10, accessories=15, bodyColor=30
- Upeg #19126: backGroundColor=1, horn=12, wings=9, hair=0, legsBack=14, legsFront=7, tail=15, accessories=0, bodyColor=30
- Upeg #19127: backGroundColor=1, horn=4, wings=0, hair=0, legsBack=14, legsFront=5, tail=1, accessories=0, bodyColor=35

## Implementation plan for `pipeline/traits.py`

**Scenario: A (structured on-chain traits via two-contract call)**

### Token enumeration

There is no global `tokenByIndex(uint256)` function (not a standard ERC-721Enumerable).
The collection must be enumerated by iterating all holders:

```python
holders_count = main.functions.HoldersCount().call()
for i in range(holders_count):
    holder = main.functions.Holder(i).call()
    upeg_count = main.functions.OwnerUpegsCount(holder).call()
    # paginate with OwnerUpegsPage(holder, page, page_size)
    # Pages are 0-indexed: page=0 returns the first pageSize items.
    for page in range(ceil(upeg_count / page_size)):
        seeds = main.functions.OwnerUpegsPage(holder, page, page_size).call()
        for (upeg_id, seed) in seeds:
            traits = image.functions.getSeedData(seed).call()
            # store {upeg_id: traits_dict}
```

**Note on page indexing:** Confirmed by probe — `page=0` is the first page. Do not
start at page 1.

**Do NOT use Transfer events as an alternative.** Standard ERC-721 Transfer events do not
carry the `seed`. The only supported path to get `(id, seed)` pairs is `OwnerUpegsPage`.
(Custom events containing seeds were not observed in Etherscan; verify before using events.)

### Trait extraction (per token)

```python
TRAIT_FIELDS = [
    "backGroundColor", "body", "eyes", "hair", "horn",
    "legsBack", "legsFront", "wings", "tail", "accessories", "ground",
    "bodyColor", "eyesColor", "hairColor", "hornColor",
    "groundColor", "accessoriesColor", "tailColor",
]

def extract_traits(seed: int, image_contract) -> dict:
    meta = image_contract.functions.getSeedData(seed).call()
    # web3.py returns the UpegMetadata tuple positionally:
    #   meta[0] = backGroundColor, meta[1] = body, ..., meta[17] = tailColor
    # TRAIT_FIELDS order MUST exactly match the Solidity struct field order
    # in UPEG_METADATA_COMPONENTS (verified: the list above matches the ABI).
    return dict(zip(TRAIT_FIELDS, meta))
```

### Rarity scoring

Each trait field is treated as an independent dimension. Rarity score per token =
sum of `-log(frequency[field][value] / total_supply)` across all trait fields.
Fields with `*Count = 0` (currently `ground`, `groundCount = 0`) are excluded.
Color fields and shape fields are scored independently.

### SVG serving

`image_contract.functions.generate(seed).call()` returns a complete inline SVG string
(confirmed: 2780 chars for upeg #19125, valid `<svg>` element).
This can be served directly from a cache keyed by `(upeg_id, seed)`.

## Decision gate

**Scenario A confirmed — proceed to Task 1.**

The two-contract call `OwnerUpegsPage` + `getSeedData` gives complete structured trait data for every token with no bytecode reverse engineering required. Source is verified on Etherscan. The `generate(seed)` function also provides on-chain SVG rendering, which can be used for the image layer of the rarity site.
