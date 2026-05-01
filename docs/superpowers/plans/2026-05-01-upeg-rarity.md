# upeg-rarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, zero-cost website that surfaces rarity rankings, traits, and holder lookups for the Unipeg (uPEG) hybrid ERC-20/on-chain-NFT collection at `0x44b28991b167582f18ba0259e0173176ca125505`.

**Architecture:** Hourly Python pipeline (web3.py) reads on-chain state via free public RPCs, extracts traits, computes OpenRarity scores, emits JSON to `data/`. Vite + React + TypeScript SPA loads the JSON once and does all filtering/sorting/searching client-side. GitHub Actions runs the pipeline on cron and pushes results; Cloudflare Pages auto-deploys the static SPA.

**Tech Stack:**
- **Pipeline:** Python 3.11, web3.py, pytest
- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, React Router v6, react-window, Recharts, Vitest
- **CI/CD:** GitHub Actions (cron + on-push)
- **Hosting:** Cloudflare Pages (free tier)

**Reference spec:** `docs/superpowers/specs/2026-05-01-upeg-rarity-design.md`

---

## Task 0: Phase 0 — Contract Reverse-Engineering Gate (TIMEBOX 2 HOURS)

**This task is a HARD GATE. Do NOT proceed to Task 1 until findings are documented and (if Scenario C) the user has been re-consulted.**

**Files:**
- Create: `docs/phase0-findings.md`
- Create: `scripts/probe_contract.py`

- [ ] **Step 1: Install minimal dependencies for probing**

Run:
```bash
cd /g/claude/upeg-rarity
python -m venv .venv
source .venv/Scripts/activate  # Windows bash: .venv/Scripts/activate
pip install web3==6.20.0 eth-abi==5.1.0
```

- [ ] **Step 2: Write contract probe script**

Create `scripts/probe_contract.py`:

```python
"""Probe the uPEG contract to determine which trait-extraction scenario applies.

Exits with one of:
  Scenario A: tokenURI returns base64 JSON with structured `attributes`.
  Scenario B: tokenURI returns raw SVG (or data URI w/o JSON); traits live in pixels.
  Scenario C: no tokenURI / no externally readable trait surface.
"""
from __future__ import annotations
import base64
import json
import sys
from web3 import Web3

CONTRACT = Web3.to_checksum_address("0x44b28991b167582f18ba0259e0173176ca125505")
RPC = "https://eth.llamarpc.com"

# Minimal ABI: just enough to call tokenURI and detect ERC-721 surface
ABI = [
    {
        "name": "tokenURI",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "supportsInterface",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "interfaceId", "type": "bytes4"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "name",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "symbol",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
]


def main() -> int:
    w3 = Web3(Web3.HTTPProvider(RPC))
    if not w3.is_connected():
        print("RPC unreachable", file=sys.stderr)
        return 2

    contract = w3.eth.contract(address=CONTRACT, abi=ABI)

    # Try basic identity
    try:
        print(f"name = {contract.functions.name().call()}")
        print(f"symbol = {contract.functions.symbol().call()}")
    except Exception as e:
        print(f"name/symbol failed: {e}")

    # Try tokenURI for several IDs (1, 2, 100) since not all may be minted
    for token_id in (1, 2, 100):
        print(f"\n--- tokenURI({token_id}) ---")
        try:
            uri = contract.functions.tokenURI(token_id).call()
        except Exception as e:
            print(f"REVERTED: {e}")
            continue

        print(f"length = {len(uri)}")
        print(f"first 200 chars: {uri[:200]}")

        # Detect data URI shape
        if uri.startswith("data:application/json;base64,"):
            payload = base64.b64decode(uri.split(",", 1)[1])
            try:
                meta = json.loads(payload)
                print(f"DECODED JSON KEYS: {list(meta.keys())}")
                if "attributes" in meta:
                    print(f"ATTRIBUTES SAMPLE: {json.dumps(meta['attributes'][:5], indent=2)}")
                    print(">>> SCENARIO A (structured JSON with attributes)")
                else:
                    print(">>> SCENARIO B (JSON without attributes — likely embeds SVG only)")
            except Exception as e:
                print(f"base64 decode failed: {e}")
        elif uri.startswith("data:image/svg") or "<svg" in uri[:300]:
            print(">>> SCENARIO B (raw SVG, no JSON wrapper)")
        else:
            print(">>> UNKNOWN URI FORMAT — investigate manually")

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Run the probe and capture output**

```bash
python scripts/probe_contract.py | tee /tmp/upeg-probe.log
```

Expected: prints `name`, `symbol`, then for each token ID either a SCENARIO label or a REVERTED message.

- [ ] **Step 4: Read contract source on Etherscan**

Open https://etherscan.io/address/0x44b28991b167582f18ba0259e0173176ca125505#code in a browser. Note:
- Is source verified? If not, Scenario C is likely.
- Search for `tokenURI`, `attributes`, `traits`, `getTraits`, `tokensOfOwner`, `_baseURI` — list every external/public view function that touches per-token state.
- Check if there's a renderer / metadata helper contract referenced in storage or constants.

- [ ] **Step 5: Write findings doc**

Create `docs/phase0-findings.md`:

```markdown
# Phase 0 Findings — uPEG Contract Investigation

**Date:** YYYY-MM-DD
**Contract:** 0x44b28991b167582f18ba0259e0173176ca125505

## Scenario classification

**Determined scenario:** [A | B | C]

## Evidence

### `tokenURI(tokenId)` behavior

- Available: [yes/no]
- Returns: [paste first 300 chars of returned URI for token #1]
- Decoded JSON keys: [list]
- Has structured `attributes` array: [yes/no]
- Sample attribute entries (if any): [paste 3 examples]

### Other view functions discovered

- [function signature] — [what it returns]
- ...

### Source verification

- Etherscan source verified: [yes/no]
- Notable contracts: [main contract, renderer contract, hook contract]

## Trait dimensions identified

- [trait_type]: [observed values, count]
- ...

## Implementation plan for `pipeline/traits.py`

Based on the scenario:
- **A:** Decode `tokenURI(id)` → base64 JSON → `attributes[]`. Map `{trait_type, value}` to `{key: value}` dict.
- **B:** Decode `tokenURI(id)` → SVG. Parse N pre-determined pixel coordinates / `<rect fill=...>` colors. Map fill colors to canonical trait names per a table built from a sampled set.
- **C:** [ESCALATE — see decision below]

## Decision gate

[If A or B] Proceed to Task 1.

[If C] Implementation BLOCKED. Stop and re-consult user with these options:
  1. Reduce scope: rank only by `tokenId` ordinal, no trait-level rarity.
  2. Defer until a community indexer surfaces (e.g., on The Graph).
  3. Pay for a one-off bytecode reverse-engineering effort (out of zero-cost constraint).
```

Fill in the bracketed sections from steps 3 and 4.

- [ ] **Step 6: GATE CHECK**

If Scenario C: STOP. Do not proceed. Print to user:

> Phase 0 hit Scenario C — uPEG traits are not externally readable via standard view functions. Per the design doc §7, this requires re-design. The three options are: (1) ship rank-by-ordinal only, (2) defer, (3) bytecode RE. Which do you want?

If Scenario A or B: continue.

- [ ] **Step 7: Commit**

```bash
cd /g/claude/upeg-rarity
git add docs/phase0-findings.md scripts/probe_contract.py
git commit -m "phase 0: contract trait extraction investigation"
```

---

## Task 1: Project Skeleton + Tooling

**Files:**
- Create: `requirements.txt`, `requirements-dev.txt`, `.gitignore`, `pytest.ini`, `pipeline/__init__.py`, `pipeline/__main__.py` (stub), `pipeline/tests/__init__.py`, `pipeline/tests/conftest.py`

- [ ] **Step 1: Write `.gitignore`**

Create `.gitignore`:

```
# Python
__pycache__/
*.pyc
.venv/
.pytest_cache/
.mypy_cache/
.coverage

# Node
node_modules/
web/dist/
web/.vite/

# Editors
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Local secrets
.env
.env.local

# Pipeline scratch
/tmp_scan/
```

- [ ] **Step 2: Write `requirements.txt`**

Create `requirements.txt`:

```
web3==6.20.0
eth-abi==5.1.0
```

- [ ] **Step 3: Write `requirements-dev.txt`**

Create `requirements-dev.txt`:

```
-r requirements.txt
pytest==8.3.0
pytest-mock==3.14.0
responses==0.25.3
```

- [ ] **Step 4: Write `pytest.ini`**

Create `pytest.ini`:

```ini
[pytest]
testpaths = pipeline/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

- [ ] **Step 5: Create empty package files**

```bash
touch pipeline/__init__.py
mkdir -p pipeline/tests
touch pipeline/tests/__init__.py
```

Create `pipeline/tests/conftest.py`:

```python
"""Shared pytest fixtures for pipeline tests."""
import pytest


@pytest.fixture
def sample_token_uri_json() -> str:
    """Canned tokenURI output for testing trait decoding.

    Replace with a real recorded value from Phase 0 once known.
    """
    return "data:application/json;base64,eyJuYW1lIjoiVXBlZyAjMSJ9"
```

- [ ] **Step 6: Install and verify**

```bash
cd /g/claude/upeg-rarity
source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest --collect-only
```

Expected: `0 tests collected` (no tests yet, but pytest config is valid).

- [ ] **Step 7: Commit**

```bash
git add .gitignore requirements.txt requirements-dev.txt pytest.ini pipeline/
git commit -m "chore: project skeleton + pytest config"
```

---

## Task 2: RPC Client with Rotation + Retry

**Files:**
- Create: `pipeline/rpc.py`, `pipeline/tests/test_rpc.py`

- [ ] **Step 1: Write failing test**

Create `pipeline/tests/test_rpc.py`:

```python
"""Tests for pipeline.rpc — RPC rotation and retry."""
from unittest.mock import MagicMock
import pytest
from pipeline.rpc import RpcRouter, AllRpcsFailed


def test_router_returns_first_success():
    a = MagicMock(return_value="A_OK")
    b = MagicMock(return_value="B_OK")
    router = RpcRouter([a, b], max_retries=1)
    assert router.call(lambda fn: fn()) == "A_OK"
    a.assert_called_once()
    b.assert_not_called()


def test_router_rotates_on_failure():
    a = MagicMock(side_effect=Exception("rate limited"))
    b = MagicMock(return_value="B_OK")
    router = RpcRouter([a, b], max_retries=1)
    assert router.call(lambda fn: fn()) == "B_OK"
    assert a.call_count == 1
    assert b.call_count == 1


def test_router_retries_within_endpoint():
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] < 2:
            raise Exception("transient")
        return "OK"

    router = RpcRouter([flaky], max_retries=3)
    assert router.call(lambda fn: fn()) == "OK"
    assert calls["n"] == 2


def test_router_raises_when_all_exhausted():
    a = MagicMock(side_effect=Exception("bad"))
    b = MagicMock(side_effect=Exception("worse"))
    router = RpcRouter([a, b], max_retries=2)
    with pytest.raises(AllRpcsFailed):
        router.call(lambda fn: fn())
    assert a.call_count == 2
    assert b.call_count == 2
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pytest pipeline/tests/test_rpc.py -v
```

Expected: `ModuleNotFoundError: No module named 'pipeline.rpc'`

- [ ] **Step 3: Write implementation**

Create `pipeline/rpc.py`:

```python
"""RPC router: rotate across multiple endpoints with bounded retry.

Usage:
    router = RpcRouter.from_urls(["https://...", "https://..."])
    block = router.call(lambda w3: w3.eth.block_number)
"""
from __future__ import annotations

import logging
import os
import time
from typing import Callable, Sequence, TypeVar

from web3 import Web3

logger = logging.getLogger(__name__)

T = TypeVar("T")

DEFAULT_RPC_URLS = (
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
)


class AllRpcsFailed(RuntimeError):
    pass


class RpcRouter:
    def __init__(
        self,
        endpoints: Sequence[Callable[..., object]],
        max_retries: int = 3,
        backoff_seconds: float = 0.5,
    ):
        if not endpoints:
            raise ValueError("RpcRouter requires at least one endpoint")
        self._endpoints = list(endpoints)
        self._max_retries = max_retries
        self._backoff = backoff_seconds

    @classmethod
    def from_urls(cls, urls: Sequence[str], **kwargs) -> "RpcRouter":
        endpoints = [Web3(Web3.HTTPProvider(u)) for u in urls]
        return cls(endpoints, **kwargs)

    @classmethod
    def from_env(cls, **kwargs) -> "RpcRouter":
        raw = os.environ.get("RPC_URLS", ",".join(DEFAULT_RPC_URLS))
        urls = [u.strip() for u in raw.split(",") if u.strip()]
        return cls.from_urls(urls, **kwargs)

    def call(self, fn: Callable[[object], T]) -> T:
        """Run fn(endpoint) trying each endpoint up to max_retries times."""
        last_err: Exception | None = None
        for endpoint in self._endpoints:
            for attempt in range(self._max_retries):
                try:
                    return fn(endpoint)
                except Exception as e:
                    last_err = e
                    logger.warning(
                        "RPC call failed on endpoint %s (attempt %d/%d): %s",
                        getattr(endpoint, "provider", endpoint),
                        attempt + 1,
                        self._max_retries,
                        e,
                    )
                    time.sleep(self._backoff * (2**attempt))
        raise AllRpcsFailed(
            f"All {len(self._endpoints)} endpoints exhausted after "
            f"{self._max_retries} retries each. Last error: {last_err}"
        )
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pytest pipeline/tests/test_rpc.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rpc.py pipeline/tests/test_rpc.py
git commit -m "feat(pipeline): RPC router with rotation and bounded retry"
```

---

## Task 3: Holder Enumerator (REVISED per Phase 0)

> **Phase 0 update:** The original plan assumed standard ERC-721 with Transfer events + `tokenURI`. Phase 0 found `tokenURI` reverts unconditionally. The collection is enumerated via `HoldersCount` → `Holder(i)` → `OwnerUpegsPage(holder, page, size)` returning `(id, seed)` tuples. See `docs/phase0-findings.md` for full evidence.

**Files:**
- Create: `pipeline/contract.py` (addresses + ABIs + TRAIT_FIELDS)
- Create: `pipeline/enumerate.py`, `pipeline/tests/test_enumerate.py`

- [ ] **Step 1: Write contract constants**

Create `pipeline/contract.py`:

```python
"""uPEG contract addresses + ABI fragments + trait schema used by the pipeline.

The collection lives across two contracts:
- UPEG_ADDRESS: main hybrid ERC-20/NFT contract. Holds enumeration surface.
- HOOK_ADDRESS: imageParams helper. Holds trait extraction (getSeedData) and SVG (generate).

`tokenURI` is intentionally NOT in any ABI — it reverts unconditionally on chain.
"""
from web3 import Web3

UPEG_ADDRESS = Web3.to_checksum_address("0x44b28991b167582f18ba0259e0173176ca125505")
HOOK_ADDRESS = Web3.to_checksum_address("0xe54082DfBf044B6a8F584bdDdb90a22d5613C440")

# Field order MUST match the Solidity UpegMetadata struct exactly.
# web3.py decodes structs as positional tuples; meta[i] corresponds to TRAIT_FIELDS[i].
TRAIT_FIELDS: tuple[str, ...] = (
    "backGroundColor",  # 0
    "body",             # 1
    "eyes",             # 2
    "horn",             # 3
    "wings",            # 4
    "tail",             # 5
    "legsFront",        # 6
    "legsBack",         # 7
    "accessories",      # 8
    "hair",             # 9
    "ground",           # 10
    "bodyColor",        # 11
    "hornColor",        # 12
    "wingsColor",       # 13
    "tailColor",        # 14
    "hairColor",        # 15
    "accessoriesColor", # 16
    "eyesColor",        # 17
)

MAIN_ABI = [
    {
        "name": "HoldersCount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "Holder",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "index", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "OwnerUpegsCount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "OwnerUpegsPage",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "page", "type": "uint256"},
            {"name": "pageSize", "type": "uint256"},
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "seed", "type": "uint256"},
                ],
            }
        ],
    },
]

# UpegMetadata struct (18 uint8 fields) — must match TRAIT_FIELDS order
_METADATA_COMPONENTS = [{"name": n, "type": "uint8"} for n in TRAIT_FIELDS]

HOOK_ABI = [
    {
        "name": "getSeedData",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"name": "", "type": "tuple", "components": _METADATA_COMPONENTS}],
    },
    {
        "name": "generate",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
    },
]
```

- [ ] **Step 2: Write failing test**

Create `pipeline/tests/test_enumerate.py`:

```python
"""Tests for pipeline.enumerate — holder-and-holdings enumeration."""
from pipeline.enumerate import enumerate_all, enumerate_holders, enumerate_holdings


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeMain:
    """Stand-in for the main UPEG contract — implements HoldersCount/Holder/OwnerUpegs*."""
    def __init__(self, holdings_by_holder: dict[str, list[tuple[int, int]]]):
        self._holdings = holdings_by_holder
        self._holders = list(holdings_by_holder.keys())

    @property
    def functions(self):
        return self

    def HoldersCount(self):
        return _FnReturn(len(self._holders))

    def Holder(self, index):
        return _FnReturn(self._holders[index])

    def OwnerUpegsCount(self, owner):
        return _FnReturn(len(self._holdings.get(owner, [])))

    def OwnerUpegsPage(self, owner, page, pageSize):
        items = self._holdings.get(owner, [])
        start = page * pageSize
        return _FnReturn(items[start : start + pageSize])


class _FakeW3:
    def __init__(self, main_contract):
        self._main = main_contract
        self.eth = self

    def contract(self, address, abi):
        return self._main


def test_enumerate_holders_returns_all():
    main = _FakeMain({"0xaaa": [], "0xbbb": [], "0xccc": []})
    w3 = _FakeW3(main)
    assert enumerate_holders(w3) == ["0xaaa", "0xbbb", "0xccc"]


def test_enumerate_holdings_pages_through_one_owner():
    main = _FakeMain({
        "0xaaa": [(1, 100), (2, 200), (3, 300), (4, 400), (5, 500)],
    })
    w3 = _FakeW3(main)
    holdings = enumerate_holdings(w3, "0xaaa", page_size=2)
    assert holdings == [(1, 100), (2, 200), (3, 300), (4, 400), (5, 500)]


def test_enumerate_holdings_handles_empty_owner():
    main = _FakeMain({"0xaaa": []})
    w3 = _FakeW3(main)
    assert enumerate_holdings(w3, "0xaaa") == []


def test_enumerate_all_combines_holders_and_holdings():
    main = _FakeMain({
        "0xaaa": [(1, 100), (2, 200)],
        "0xbbb": [(3, 300)],
    })
    w3 = _FakeW3(main)
    result = enumerate_all(w3)
    assert sorted(result) == [(1, 100, "0xaaa"), (2, 200, "0xaaa"), (3, 300, "0xbbb")]
```

- [ ] **Step 3: Run test, verify it fails**

```bash
pytest pipeline/tests/test_enumerate.py -v
```

Expected: ImportError on `pipeline.enumerate`.

- [ ] **Step 4: Write implementation**

Create `pipeline/enumerate.py`:

```python
"""Holder + holdings enumeration via the main uPEG contract.

uPEG does NOT expose tokenURI. Token enumeration walks current holders
(via HoldersCount + Holder(i)) and pages through each holder's holdings
(via OwnerUpegsPage). Each holding is a (token_id, seed) tuple — the seed
is what feeds trait extraction in `pipeline.traits`.
"""
from __future__ import annotations

import logging

from pipeline.contract import MAIN_ABI, UPEG_ADDRESS

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 100


def _main_contract(w3):
    return w3.eth.contract(address=UPEG_ADDRESS, abi=MAIN_ABI)


def enumerate_holders(w3) -> list[str]:
    """Return every current uPEG holder address."""
    c = _main_contract(w3)
    n = c.functions.HoldersCount().call()
    return [c.functions.Holder(i).call() for i in range(n)]


def enumerate_holdings(
    w3, holder: str, page_size: int = DEFAULT_PAGE_SIZE
) -> list[tuple[int, int]]:
    """Return [(token_id, seed), ...] currently held by `holder`."""
    c = _main_contract(w3)
    count = c.functions.OwnerUpegsCount(holder).call()
    if count == 0:
        return []
    pages = (count + page_size - 1) // page_size
    out: list[tuple[int, int]] = []
    for page in range(pages):
        # OwnerUpegsPage is 0-indexed (verified in Phase 0)
        items = c.functions.OwnerUpegsPage(holder, page, page_size).call()
        for entry in items:
            # web3.py returns each tuple element as positional (id, seed)
            out.append((int(entry[0]), int(entry[1])))
    return out


def enumerate_all(w3) -> list[tuple[int, int, str]]:
    """Enumerate the full collection as [(token_id, seed, owner), ...]."""
    out: list[tuple[int, int, str]] = []
    holders = enumerate_holders(w3)
    logger.info("Enumerating holdings across %d holders", len(holders))
    for holder in holders:
        for token_id, seed in enumerate_holdings(w3, holder):
            out.append((token_id, seed, holder))
    return out
```

- [ ] **Step 5: Run test, verify it passes**

```bash
pytest pipeline/tests/test_enumerate.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add pipeline/contract.py pipeline/enumerate.py pipeline/tests/test_enumerate.py
git commit -m "feat(pipeline): holder/holdings enumeration via OwnerUpegsPage"
```

---

## Task 4: Trait Extractor via getSeedData (REVISED per Phase 0)

> **Phase 0 update:** Traits come from `getSeedData(seed)` on the helper hook contract `0xe54082...`, NOT from `tokenURI`. The function returns an 18-field uint8 tuple decoded positionally per `TRAIT_FIELDS`. SVG comes from `generate(seed)` on the same contract. See `docs/phase0-findings.md`.

**Files:**
- Create: `pipeline/traits.py`, `pipeline/tests/test_traits.py`

- [ ] **Step 1: Write failing test**

Create `pipeline/tests/test_traits.py`:

```python
"""Tests for pipeline.traits — seed -> structured traits dict + SVG."""
import pytest
from pipeline.contract import TRAIT_FIELDS
from pipeline.traits import decode_seed_tuple, extract_traits, extract_svg


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeHook:
    def __init__(self, seed_to_meta: dict[int, tuple], seed_to_svg: dict[int, str]):
        self._meta = seed_to_meta
        self._svg = seed_to_svg

    @property
    def functions(self):
        return self

    def getSeedData(self, seed):
        return _FnReturn(self._meta[seed])

    def generate(self, seed):
        return _FnReturn(self._svg[seed])


class _FakeW3:
    def __init__(self, hook):
        self._hook = hook
        self.eth = self

    def contract(self, address, abi):
        return self._hook


def test_decode_seed_tuple_maps_positionally():
    # 18 values, one per TRAIT_FIELDS entry, all distinct so we can verify order
    meta = tuple(range(18))
    result = decode_seed_tuple(meta)
    assert result == {field: i for i, field in enumerate(TRAIT_FIELDS)}


def test_decode_seed_tuple_rejects_wrong_length():
    with pytest.raises(ValueError, match="expected 18"):
        decode_seed_tuple((1, 2, 3))


def test_extract_traits_calls_hook_and_decodes():
    seed = 12345
    meta = tuple(range(18))
    w3 = _FakeW3(_FakeHook({seed: meta}, {}))
    result = extract_traits(w3, seed)
    assert result["backGroundColor"] == 0
    assert result["eyesColor"] == 17
    assert len(result) == 18


def test_extract_svg_calls_generate():
    seed = 999
    w3 = _FakeW3(_FakeHook({}, {seed: "<svg width='24'></svg>"}))
    assert extract_svg(w3, seed) == "<svg width='24'></svg>"
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pytest pipeline/tests/test_traits.py -v
```

Expected: ImportError on `pipeline.traits`.

- [ ] **Step 3: Write implementation**

Create `pipeline/traits.py`:

```python
"""Trait + SVG extraction via the helper hook contract.

uPEG traits live in a 2-contract setup. The main contract gives us (id, seed)
pairs. This module turns seed -> structured trait dict via getSeedData, and
seed -> on-chain SVG via generate. Both calls hit HOOK_ADDRESS.

web3.py decodes the UpegMetadata struct as a positional tuple — element i
maps to TRAIT_FIELDS[i]. See docs/phase0-findings.md for the full schema.
"""
from __future__ import annotations

from pipeline.contract import HOOK_ABI, HOOK_ADDRESS, TRAIT_FIELDS


def _hook_contract(w3):
    return w3.eth.contract(address=HOOK_ADDRESS, abi=HOOK_ABI)


def decode_seed_tuple(meta: tuple) -> dict[str, int]:
    """Map a positional 18-tuple from getSeedData() into a {field_name: value} dict."""
    if len(meta) != len(TRAIT_FIELDS):
        raise ValueError(
            f"expected {len(TRAIT_FIELDS)} fields, got {len(meta)}: {meta}"
        )
    return {field: int(value) for field, value in zip(TRAIT_FIELDS, meta)}


def extract_traits(w3, seed: int) -> dict[str, int]:
    """Read traits for a single seed via getSeedData(seed) on the hook contract."""
    meta = _hook_contract(w3).functions.getSeedData(seed).call()
    return decode_seed_tuple(meta)


def extract_svg(w3, seed: int) -> str:
    """Read the on-chain SVG for a single seed via generate(seed) on the hook contract."""
    return _hook_contract(w3).functions.generate(seed).call()
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pytest pipeline/tests/test_traits.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add pipeline/traits.py pipeline/tests/test_traits.py
git commit -m "feat(pipeline): seed -> traits + svg via getSeedData/generate"
```

---

## Task 5: OpenRarity Score Calculator

Implements the [Information Content rarity formula](https://github.com/ProjectOpenSea/open-rarity): for each token, IC = Σ over traits of `−log2(p_i)` where `p_i` = frequency of that trait value across the collection. Higher IC = rarer.

**Files:**
- Create: `pipeline/rarity.py`, `pipeline/tests/test_rarity.py`

- [ ] **Step 1: Write failing test**

Create `pipeline/tests/test_rarity.py`:

```python
"""Tests for pipeline.rarity — Information Content scoring + ranking."""
import math
import pytest
from pipeline.rarity import (
    compute_trait_frequencies,
    compute_information_content,
    rank_collection,
)


def test_frequencies_count_per_trait_value():
    items = [
        {"id": 1, "traits": {"color": "red", "layer": "sky"}},
        {"id": 2, "traits": {"color": "red", "layer": "ground"}},
        {"id": 3, "traits": {"color": "blue", "layer": "sky"}},
    ]
    freqs = compute_trait_frequencies(items)
    assert freqs["color"]["red"] == 2 / 3
    assert freqs["color"]["blue"] == 1 / 3
    assert freqs["layer"]["sky"] == 2 / 3


def test_ic_for_unique_trait_is_log2_of_n():
    # 3 items, one with unique color → -log2(1/3)
    items = [
        {"id": 1, "traits": {"color": "rare"}},
        {"id": 2, "traits": {"color": "common"}},
        {"id": 3, "traits": {"color": "common"}},
    ]
    freqs = compute_trait_frequencies(items)
    ic_rare = compute_information_content(items[0]["traits"], freqs)
    ic_common = compute_information_content(items[1]["traits"], freqs)
    assert ic_rare == pytest.approx(math.log2(3))
    assert ic_common == pytest.approx(math.log2(1.5))


def test_rank_collection_assigns_dense_ranks_descending_by_score():
    items = [
        {"id": 1, "traits": {"color": "rare"}},
        {"id": 2, "traits": {"color": "common"}},
        {"id": 3, "traits": {"color": "common"}},
    ]
    ranked = rank_collection(items)
    by_id = {r["id"]: r for r in ranked}
    assert by_id[1]["rank"] == 1  # rarest
    assert by_id[2]["rank"] == 2
    assert by_id[3]["rank"] == 2  # tied
    assert by_id[1]["score"] > by_id[2]["score"]


def test_rank_handles_empty_collection():
    assert rank_collection([]) == []
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pytest pipeline/tests/test_rarity.py -v
```

Expected: ImportError on `pipeline.rarity`.

- [ ] **Step 3: Write implementation**

Create `pipeline/rarity.py`:

```python
"""OpenRarity-style Information Content rarity scoring.

For each token: score = Σ_t  −log2( freq(token.traits[t]) )
Higher score = rarer. Ranks are dense (ties share a rank, next rank skips).
"""
from __future__ import annotations

import math
from collections import Counter
from typing import Any


def compute_trait_frequencies(items: list[dict]) -> dict[str, dict[Any, float]]:
    """Return {trait_type: {value: freq}} where freq = count / total."""
    if not items:
        return {}
    counts: dict[str, Counter] = {}
    total = len(items)
    for item in items:
        for k, v in item["traits"].items():
            counts.setdefault(k, Counter())[v] += 1
    return {
        k: {v: c / total for v, c in counter.items()}
        for k, counter in counts.items()
    }


def compute_information_content(
    traits: dict[str, Any],
    freqs: dict[str, dict[Any, float]],
) -> float:
    score = 0.0
    for k, v in traits.items():
        p = freqs.get(k, {}).get(v)
        if p is None or p <= 0:
            continue
        score += -math.log2(p)
    return score


def rank_collection(items: list[dict]) -> list[dict]:
    """Annotate each item with `score` and `rank`. Returns new list (input not mutated)."""
    if not items:
        return []
    freqs = compute_trait_frequencies(items)
    scored = [
        {**item, "score": compute_information_content(item["traits"], freqs)}
        for item in items
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)

    rank = 0
    last_score = None
    next_rank_value = 1
    for idx, item in enumerate(scored, start=1):
        if item["score"] != last_score:
            rank = next_rank_value
            last_score = item["score"]
        item["rank"] = rank
        next_rank_value = idx + 1
    return scored
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pytest pipeline/tests/test_rarity.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add pipeline/rarity.py pipeline/tests/test_rarity.py
git commit -m "feat(pipeline): OpenRarity Information Content scoring"
```

---

## Task 6: JSON Emitter

**Files:**
- Create: `pipeline/emit.py`, `pipeline/tests/test_emit.py`

- [ ] **Step 1: Write failing test**

Create `pipeline/tests/test_emit.py`:

```python
"""Tests for pipeline.emit — JSON file serialization."""
import json
from pathlib import Path
from pipeline.emit import emit_all


def test_emit_all_writes_three_files(tmp_path: Path):
    items = [
        {"id": 1, "owner": "0xabc", "traits": {"color": "red"}, "score": 1.5, "rank": 1, "svg": "<svg/>"},
    ]
    emit_all(out_dir=tmp_path, items=items, block=999)

    upegs = json.loads((tmp_path / "upegs.json").read_text())
    assert upegs["block"] == 999
    assert upegs["total_minted"] == 1
    assert upegs["items"][0]["id"] == 1

    stats = json.loads((tmp_path / "stats.json").read_text())
    assert stats["total_minted"] == 1
    assert stats["trait_frequencies"]["color"]["red"] == 1

    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["block"] == 999
    assert "data_hash" in meta
    assert len(meta["data_hash"]) == 64  # sha256 hex


def test_meta_hash_changes_when_items_change(tmp_path: Path):
    items_a = [{"id": 1, "owner": "0xa", "traits": {"c": "r"}, "score": 1.0, "rank": 1, "svg": ""}]
    items_b = [{"id": 1, "owner": "0xa", "traits": {"c": "b"}, "score": 1.0, "rank": 1, "svg": ""}]
    emit_all(tmp_path, items_a, block=1)
    h1 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    emit_all(tmp_path, items_b, block=1)
    h2 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    assert h1 != h2
```

- [ ] **Step 2: Run test, verify it fails**

```bash
pytest pipeline/tests/test_emit.py -v
```

Expected: ImportError on `pipeline.emit`.

- [ ] **Step 3: Write implementation**

Create `pipeline/emit.py`:

```python
"""Serialize pipeline output to JSON files in `data/`."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def emit_all(out_dir: Path, items: list[dict], block: int) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    upegs_payload = {
        "generated_at": now,
        "block": block,
        "total_minted": len(items),
        "items": items,
    }
    upegs_text = json.dumps(upegs_payload, separators=(",", ":"), sort_keys=True)
    (out_dir / "upegs.json").write_text(upegs_text)

    stats_payload = _build_stats(items)
    (out_dir / "stats.json").write_text(json.dumps(stats_payload, indent=2))

    data_hash = hashlib.sha256(upegs_text.encode()).hexdigest()
    meta_payload = {
        "generated_at": now,
        "block": block,
        "total_minted": len(items),
        "data_hash": data_hash,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta_payload, indent=2))


def _build_stats(items: list[dict]) -> dict:
    counters: dict[str, Counter] = {}
    for item in items:
        for k, v in item["traits"].items():
            counters.setdefault(k, Counter())[v] += 1
    return {
        "total_minted": len(items),
        "trait_frequencies": {
            k: dict(c.most_common()) for k, c in counters.items()
        },
    }
```

- [ ] **Step 4: Run test, verify it passes**

```bash
pytest pipeline/tests/test_emit.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add pipeline/emit.py pipeline/tests/test_emit.py
git commit -m "feat(pipeline): JSON emitter for upegs / stats / meta"
```

---

## Task 7: Pipeline Orchestrator (REVISED per Phase 0)

> **Phase 0 update:** No state file is needed. The pipeline reads current chain state each run via holder enumeration; the previous run's `data/upegs.json` is the cache (keyed by id+seed since traits are immutable per seed). No genesis block lookup is required.

**Files:**
- Create: `pipeline/__main__.py` (replaces stub)
- Create: `pipeline/tests/test_pipeline_e2e.py`

- [ ] **Step 1: Write orchestrator**

Replace `pipeline/__main__.py`:

```python
"""Pipeline entry point.

Run as:
    python -m pipeline           # full run
    python -m pipeline --dry-run # don't write outputs

Strategy:
  1. Enumerate every (id, seed, owner) currently held on chain.
  2. For each (id, seed): if previous run's upegs.json had a matching
     (id, seed) entry, reuse its traits + svg (immutable per seed).
     Otherwise call the hook contract for fresh traits + svg.
  3. Always refresh `owner` (changes on every transfer).
  4. Compute OpenRarity scores across the full set, emit JSON.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from pipeline.emit import emit_all
from pipeline.enumerate import enumerate_all
from pipeline.rarity import rank_collection
from pipeline.rpc import RpcRouter
from pipeline.traits import extract_svg, extract_traits

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("pipeline")

DATA_DIR = Path("data")


def _load_cache() -> dict[tuple[int, int], dict]:
    """Index previous run's items by (id, seed) for cache reuse."""
    upegs_path = DATA_DIR / "upegs.json"
    if not upegs_path.exists():
        return {}
    cache: dict[tuple[int, int], dict] = {}
    for item in json.loads(upegs_path.read_text()).get("items", []):
        # Older items may lack `seed` if schema evolves — skip those, recompute.
        if "seed" not in item:
            continue
        cache[(int(item["id"]), int(item["seed"]))] = item
    return cache


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    router = RpcRouter.from_env()
    log.info("Enumerating current uPEG holders + holdings")
    triples = router.call(enumerate_all)
    latest_block = router.call(lambda w3: w3.eth.block_number)
    log.info("Got %d (id, seed, owner) entries at block %d", len(triples), latest_block)

    cache = _load_cache()
    log.info("Cache hit candidates from previous run: %d", len(cache))

    items: list[dict] = []
    cache_hits = 0
    for token_id, seed, owner in triples:
        cached = cache.get((token_id, seed))
        if cached is not None:
            cache_hits += 1
            base = {
                "id": token_id,
                "seed": seed,
                "traits": cached["traits"],
                "svg": cached["svg"],
            }
        else:
            traits = router.call(lambda w3, s=seed: extract_traits(w3, s))
            svg = router.call(lambda w3, s=seed: extract_svg(w3, s))
            base = {"id": token_id, "seed": seed, "traits": traits, "svg": svg}
        items.append({**base, "owner": owner})

    log.info("Cache hits: %d / %d (%.1f%%)",
             cache_hits, len(triples), 100 * cache_hits / max(1, len(triples)))

    ranked = rank_collection(items)

    if args.dry_run:
        log.info("Dry run: would emit %d items at block %d", len(ranked), latest_block)
        return 0

    emit_all(DATA_DIR, ranked, block=latest_block)
    log.info("Wrote %d items to %s", len(ranked), DATA_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Write end-to-end pipeline test (with mocked RPC)**

Create `pipeline/tests/test_pipeline_e2e.py`:

```python
"""End-to-end pipeline test with fully mocked RPC + contracts."""
import json
from pathlib import Path
from unittest.mock import patch

from pipeline.__main__ import main
from pipeline.contract import HOOK_ADDRESS, UPEG_ADDRESS


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeMain:
    """Main UPEG contract mock — implements enumeration."""
    def __init__(self, holdings: dict[str, list[tuple[int, int]]]):
        self._holdings = holdings
        self._holders = list(holdings.keys())

    @property
    def functions(self):
        return self

    def HoldersCount(self):
        return _FnReturn(len(self._holders))

    def Holder(self, i):
        return _FnReturn(self._holders[i])

    def OwnerUpegsCount(self, owner):
        return _FnReturn(len(self._holdings[owner]))

    def OwnerUpegsPage(self, owner, page, page_size):
        items = self._holdings[owner]
        start = page * page_size
        return _FnReturn(items[start:start + page_size])


class _FakeHook:
    """Hook contract mock — implements getSeedData + generate."""
    def __init__(self, seed_data: dict[int, tuple], svgs: dict[int, str]):
        self._seed_data = seed_data
        self._svgs = svgs

    @property
    def functions(self):
        return self

    def getSeedData(self, seed):
        return _FnReturn(self._seed_data[seed])

    def generate(self, seed):
        return _FnReturn(self._svgs[seed])


class _FakeEth:
    def __init__(self, main, hook, latest_block):
        self._main = main
        self._hook = hook
        self.block_number = latest_block

    def contract(self, address, abi):
        if address == UPEG_ADDRESS:
            return self._main
        if address == HOOK_ADDRESS:
            return self._hook
        raise AssertionError(f"unexpected contract address {address}")


class _FakeW3:
    def __init__(self, main, hook, latest_block):
        self.eth = _FakeEth(main, hook, latest_block)


def test_pipeline_end_to_end(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    main_contract = _FakeMain({
        "0xaaaa": [(1, 100), (2, 200)],
        "0xbbbb": [(3, 300)],
    })
    # 18-tuple traits — first byte is "category" so we can verify rarity
    hook_contract = _FakeHook(
        seed_data={
            100: (0,) + tuple(range(1, 18)),
            200: (1,) + tuple(range(1, 18)),
            300: (1,) + tuple(range(1, 18)),
        },
        svgs={100: "<svg id='100'/>", 200: "<svg id='200'/>", 300: "<svg id='300'/>"},
    )
    fake_w3 = _FakeW3(main_contract, hook_contract, latest_block=500)

    with patch("pipeline.rpc.RpcRouter.from_env") as mock_router:
        mock_router.return_value.call.side_effect = lambda fn: fn(fake_w3)
        rc = main([])

    assert rc == 0
    upegs = json.loads((tmp_path / "data" / "upegs.json").read_text())
    assert upegs["total_minted"] == 3
    ids = sorted(item["id"] for item in upegs["items"])
    assert ids == [1, 2, 3]
    by_id = {item["id"]: item for item in upegs["items"]}
    # Token 1 has unique backGroundColor=0 (others=1) → rarest → rank 1
    assert by_id[1]["rank"] == 1
    # Owner mapping reflects the fake holdings
    assert by_id[1]["owner"] == "0xaaaa"
    assert by_id[3]["owner"] == "0xbbbb"
```

- [ ] **Step 3: Run E2E test, verify it passes**

```bash
pytest pipeline/tests/test_pipeline_e2e.py -v
```

Expected: 1 passed.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
pytest -v
```

Expected: all tests pass (18 total: 4 rpc + 4 enumerate + 4 traits + 4 rarity + 2 emit + 1 e2e — adjust if your counts differ).

- [ ] **Step 5: Commit**

```bash
git add pipeline/__main__.py pipeline/tests/test_pipeline_e2e.py
git commit -m "feat(pipeline): orchestrator using holder enumeration + getSeedData"
```

---

## Task 8: First Mainnet Run

**Goal:** Validate pipeline end-to-end against real chain data and produce the first `data/*.json` artifacts.

- [ ] **Step 1: Run a dry run against mainnet**

```bash
cd /g/claude/upeg-rarity
source .venv/Scripts/activate
python -m pipeline --dry-run
```

Expected: no errors, log lines along the lines of:
- `Enumerating current uPEG holders + holdings`
- `Got N (id, seed, owner) entries at block X`
- `Cache hit candidates from previous run: 0` (first run)
- `Cache hits: 0 / N (0.0%)`
- `Dry run: would emit N items at block X`

Sanity check `N` is between 100 and 100,000 (Phase 0 saw ~1208 holders × few uPEGs each). The first run will be slow because every (id, seed) needs hook calls — expect 5–30 minutes depending on RPC throughput. Subsequent runs use the cache and are much faster.

- [ ] **Step 2: Run for real**

```bash
python -m pipeline
```

Expected: `data/upegs.json`, `data/stats.json`, `data/meta.json` all created.

- [ ] **Step 3: Sanity-check the output**

```bash
python -c "import json; d = json.load(open('data/upegs.json')); print('items:', d['total_minted'], 'first item:', d['items'][0])"
python -c "import json; print(json.load(open('data/stats.json'))['trait_frequencies'])"
```

Verify:
- `total_minted` matches step 1 dry run
- First item has 18 trait fields populated (numeric uint8 values), non-empty `svg`, `rank=1` has the highest score
- `trait_frequencies` has reasonable cardinality per trait type (e.g., `backGroundColor` should have ~6 distinct values per Phase 0)

- [ ] **Step 4: Commit data artifacts**

```bash
git add data/
git commit -m "data: first mainnet run snapshot"
```

---

## Task 9: Frontend Scaffold (Vite + React + TS + Tailwind)

**Files:**
- Create: `web/` directory tree via `npm create vite`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /g/claude/upeg-rarity
npm create vite@latest web -- --template react-ts
cd web
npm install
```

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install react-router-dom@6 react-window@1 recharts@2
npm install -D tailwindcss@3 postcss autoprefixer vitest@2 @testing-library/react@16 @testing-library/jest-dom@6 jsdom@25 @types/react-window
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `web/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-zinc-950 text-zinc-100 antialiased;
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 4: Configure Vitest**

Edit `web/vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Configure Vite to serve `../data/*.json` at dev time**

The SPA fetches JSON from `/upegs.json`, `/stats.json`, `/meta.json`. We keep Vite's default `publicDir` (`web/public`) for static config like `_redirects`, and add a tiny middleware that maps the three data URLs to `../data/`.

Replace `web/vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(__dirname, "../data");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-data-files",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /^\/(upegs|stats|meta)\.json$/.test(req.url)) {
            const filePath = path.join(dataDir, req.url);
            if (fs.existsSync(filePath)) {
              res.setHeader("content-type", "application/json");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  base: "./",
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

For production builds, `npm run build` (Task 20 Step 2) copies `data/*.json` into `dist/` after Vite finishes. `_redirects` in `web/public` is copied automatically by Vite.

- [ ] **Step 6: Replace App.tsx with a placeholder + smoke test**

Replace `web/src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-bold">uPEG Rarity</h1>
      <p className="mt-2 text-zinc-400">Coming soon.</p>
    </div>
  );
}
```

Create `web/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders title", () => {
  render(<App />);
  expect(screen.getByText("uPEG Rarity")).toBeInTheDocument();
});
```

- [ ] **Step 7: Verify dev server boots and tests pass**

```bash
cd web
npm run dev &
sleep 3
curl -sf http://localhost:5173/ | grep -q "<div id=\"root\">" && echo "OK"
kill %1
npm test -- --run
```

Expected: smoke test passes, dev server returned the index html.

- [ ] **Step 8: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/
git commit -m "feat(web): Vite + React + TS + Tailwind scaffold with smoke test"
```

---

## Task 10: Data Layer (fetch + cache + index)

**Files:**
- Create: `web/src/lib/data.ts`, `web/src/lib/data.test.ts`, `web/src/types.ts`

- [ ] **Step 1: Write types**

Create `web/src/types.ts`:

```ts
export interface Upeg {
  id: number;
  owner: string;
  traits: Record<string, string | number>;
  score: number;
  rank: number;
  svg: string;
}

export interface UpegsFile {
  generated_at: string;
  block: number;
  total_minted: number;
  items: Upeg[];
}

export interface StatsFile {
  total_minted: number;
  trait_frequencies: Record<string, Record<string, number>>;
}

export interface MetaFile {
  generated_at: string;
  block: number;
  total_minted: number;
  data_hash: string;
}

export interface DataBundle {
  upegs: UpegsFile;
  stats: StatsFile;
  meta: MetaFile;
  byId: Map<number, Upeg>;
  byOwner: Map<string, Upeg[]>;
}
```

- [ ] **Step 2: Write failing tests**

Create `web/src/lib/data.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadBundle, indexUpegs, _resetCacheForTests } from "./data";
import type { Upeg, UpegsFile, StatsFile, MetaFile } from "../types";

const mockUpegs: UpegsFile = {
  generated_at: "2026-05-01T00:00:00Z",
  block: 100,
  total_minted: 2,
  items: [
    { id: 1, owner: "0xa", traits: { color: "r" }, score: 2, rank: 1, svg: "<svg/>" },
    { id: 2, owner: "0xb", traits: { color: "b" }, score: 1, rank: 2, svg: "<svg/>" },
  ],
};
const mockStats: StatsFile = { total_minted: 2, trait_frequencies: { color: { r: 1, b: 1 } } };
const mockMeta: MetaFile = { generated_at: "2026-05-01T00:00:00Z", block: 100, total_minted: 2, data_hash: "h1" };

function fakeFetch(map: Record<string, unknown>): typeof fetch {
  return (url) =>
    Promise.resolve(new Response(JSON.stringify(map[url as string]), { status: 200 })) as ReturnType<typeof fetch>;
}

describe("indexUpegs", () => {
  it("indexes by id and groups by owner", () => {
    const idx = indexUpegs(mockUpegs.items);
    expect(idx.byId.get(1)?.owner).toBe("0xa");
    expect(idx.byOwner.get("0xa")?.length).toBe(1);
    expect(idx.byOwner.get("0xb")?.length).toBe(1);
  });
});

describe("loadBundle", () => {
  beforeEach(() => {
    _resetCacheForTests();
    localStorage.clear();
  });

  it("fetches and returns a bundle", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    const bundle = await loadBundle();
    expect(bundle.upegs.total_minted).toBe(2);
    expect(bundle.byId.get(1)?.rank).toBe(1);
  });

  it("uses localStorage cache when meta hash matches", async () => {
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    _resetCacheForTests();
    fetchMock.mockClear();
    // Second load: meta still h1, should reuse cached upegs/stats
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/meta.json");
    expect(calledUrls).not.toContain("/upegs.json");
  });

  it("invalidates cache when meta hash changes", async () => {
    vi.stubGlobal("fetch", fakeFetch({
      "/meta.json": mockMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    await loadBundle();
    _resetCacheForTests();
    const newMeta = { ...mockMeta, data_hash: "h2" };
    const fetchMock = vi.fn(fakeFetch({
      "/meta.json": newMeta,
      "/upegs.json": mockUpegs,
      "/stats.json": mockStats,
    }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBundle();
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain("/upegs.json");
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
cd web
npm test -- --run src/lib/data.test.ts
```

Expected: module-not-found error.

- [ ] **Step 4: Write implementation**

Create `web/src/lib/data.ts`:

```ts
import type { DataBundle, MetaFile, StatsFile, Upeg, UpegsFile } from "../types";

const CACHE_KEY = "upeg-rarity:bundle:v1";

interface CacheEntry {
  hash: string;
  upegs: UpegsFile;
  stats: StatsFile;
}

let inFlight: Promise<DataBundle> | null = null;

export function _resetCacheForTests() {
  inFlight = null;
}

export function indexUpegs(items: Upeg[]) {
  const byId = new Map<number, Upeg>();
  const byOwner = new Map<string, Upeg[]>();
  for (const item of items) {
    byId.set(item.id, item);
    const owner = item.owner.toLowerCase();
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner)!.push(item);
  }
  return { byId, byOwner };
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  return (await r.json()) as T;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* quota exceeded — fall back to no cache */
  }
}

export async function loadBundle(): Promise<DataBundle> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const meta = await fetchJson<MetaFile>("/meta.json");
    const cached = readCache();
    let upegs: UpegsFile;
    let stats: StatsFile;
    if (cached && cached.hash === meta.data_hash) {
      upegs = cached.upegs;
      stats = cached.stats;
    } else {
      [upegs, stats] = await Promise.all([
        fetchJson<UpegsFile>("/upegs.json"),
        fetchJson<StatsFile>("/stats.json"),
      ]);
      writeCache({ hash: meta.data_hash, upegs, stats });
    }
    const { byId, byOwner } = indexUpegs(upegs.items);
    return { upegs, stats, meta, byId, byOwner };
  })();
  return inFlight;
}
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
npm test -- --run src/lib/data.test.ts
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/lib/data.ts web/src/lib/data.test.ts web/src/types.ts
git commit -m "feat(web): data fetch + index + meta-hash cache"
```

---

## Task 11: Filter / Sort / Search Pure Functions

**Files:**
- Create: `web/src/lib/filters.ts`, `web/src/lib/filters.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/lib/filters.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyFilters, sortByRank, searchById } from "./filters";
import type { Upeg } from "../types";

const items: Upeg[] = [
  { id: 1, owner: "0xa", traits: { color: "red", layer: "sky" }, score: 5, rank: 1, svg: "" },
  { id: 2, owner: "0xb", traits: { color: "blue", layer: "sky" }, score: 4, rank: 2, svg: "" },
  { id: 3, owner: "0xc", traits: { color: "red", layer: "ground" }, score: 3, rank: 3, svg: "" },
];

describe("applyFilters", () => {
  it("returns all items when no filters", () => {
    expect(applyFilters(items, {})).toHaveLength(3);
  });
  it("AND across trait categories, OR within", () => {
    const result = applyFilters(items, { color: ["red"] });
    expect(result.map((i) => i.id)).toEqual([1, 3]);
    const result2 = applyFilters(items, { color: ["red"], layer: ["sky"] });
    expect(result2.map((i) => i.id)).toEqual([1]);
    const result3 = applyFilters(items, { color: ["red", "blue"] });
    expect(result3.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("sortByRank", () => {
  it("sorts ascending (rank 1 first)", () => {
    const shuffled = [items[2], items[0], items[1]];
    expect(sortByRank(shuffled).map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("searchById", () => {
  it("returns exact id match", () => {
    expect(searchById(items, "2")?.id).toBe(2);
  });
  it("returns null for invalid input", () => {
    expect(searchById(items, "abc")).toBeNull();
    expect(searchById(items, "999")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```bash
cd web
npm test -- --run src/lib/filters.test.ts
```

Expected: module-not-found.

- [ ] **Step 3: Write implementation**

Create `web/src/lib/filters.ts`:

```ts
import type { Upeg } from "../types";

/** filter shape: {trait_type: [allowed values]}.
 * AND across keys, OR within values. Empty value list for a key = no filter on that key. */
export type TraitFilter = Record<string, string[]>;

export function applyFilters(items: Upeg[], filter: TraitFilter): Upeg[] {
  const entries = Object.entries(filter).filter(([, vs]) => vs.length > 0);
  if (entries.length === 0) return items;
  return items.filter((item) =>
    entries.every(([key, allowed]) => allowed.includes(String(item.traits[key])))
  );
}

export function sortByRank(items: Upeg[]): Upeg[] {
  return [...items].sort((a, b) => a.rank - b.rank);
}

export function searchById(items: Upeg[], query: string): Upeg | null {
  const id = Number.parseInt(query, 10);
  if (!Number.isFinite(id)) return null;
  return items.find((i) => i.id === id) ?? null;
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test -- --run src/lib/filters.test.ts
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/lib/filters.ts web/src/lib/filters.test.ts
git commit -m "feat(web): pure filter/sort/search functions"
```

---

## Task 12: Common Components — UpegCard + TraitChip

**Files:**
- Create: `web/src/components/TraitChip.tsx`, `web/src/components/UpegCard.tsx`, plus tests

- [ ] **Step 1: TraitChip + test**

Create `web/src/components/TraitChip.tsx`:

```tsx
interface Props {
  label: string;
  value: string | number;
  frequency?: number; // 0..1
}

export function TraitChip({ label, value, frequency }: Props) {
  const rarityHint = frequency != null ? `${(frequency * 100).toFixed(1)}%` : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs">
      <span className="text-zinc-400">{label}:</span>
      <span className="font-medium">{String(value)}</span>
      {rarityHint && <span className="text-zinc-500">({rarityHint})</span>}
    </span>
  );
}
```

Create `web/src/components/TraitChip.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { TraitChip } from "./TraitChip";

test("renders label, value, and frequency percent", () => {
  render(<TraitChip label="color" value="red" frequency={0.05} />);
  expect(screen.getByText("color:")).toBeInTheDocument();
  expect(screen.getByText("red")).toBeInTheDocument();
  expect(screen.getByText("(5.0%)")).toBeInTheDocument();
});

test("omits frequency when not provided", () => {
  render(<TraitChip label="color" value="red" />);
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: UpegCard + test**

Create `web/src/components/UpegCard.tsx`:

```tsx
import type { Upeg } from "../types";

interface Props {
  upeg: Upeg;
  onClick?: () => void;
}

export function UpegCard({ upeg, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-600"
    >
      <div
        className="h-24 w-24 [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: upeg.svg }}
      />
      <div className="text-sm">
        <span className="font-mono">#{upeg.id}</span>
        <span className="ml-2 text-zinc-400">rank {upeg.rank}</span>
      </div>
    </button>
  );
}
```

Create `web/src/components/UpegCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { UpegCard } from "./UpegCard";

const u = {
  id: 42,
  owner: "0xa",
  traits: { color: "red" },
  score: 1.5,
  rank: 7,
  svg: "<svg width='24' height='24'></svg>",
};

test("displays id and rank", () => {
  render(<UpegCard upeg={u} />);
  expect(screen.getByText("#42")).toBeInTheDocument();
  expect(screen.getByText("rank 7")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run, verify pass**

```bash
cd web
npm test -- --run src/components
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/components/
git commit -m "feat(web): TraitChip and UpegCard components"
```

---

## Task 13: Ranking Route (with virtualized table)

**Files:**
- Create: `web/src/routes/Ranking.tsx`, `web/src/routes/Ranking.test.tsx`
- Create: `web/src/components/TraitFilters.tsx`

- [ ] **Step 1: Write TraitFilters component**

Create `web/src/components/TraitFilters.tsx`:

```tsx
import type { TraitFilter } from "../lib/filters";

interface Props {
  trait_frequencies: Record<string, Record<string, number>>;
  value: TraitFilter;
  onChange: (next: TraitFilter) => void;
}

export function TraitFilters({ trait_frequencies, value, onChange }: Props) {
  const toggle = (cat: string, val: string) => {
    const current = value[cat] ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onChange({ ...value, [cat]: next });
  };

  return (
    <div className="space-y-4">
      {Object.entries(trait_frequencies).map(([cat, vals]) => (
        <div key={cat}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{cat}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(vals).map(([v, count]) => {
              const checked = (value[cat] ?? []).includes(v);
              return (
                <label
                  key={v}
                  className={`cursor-pointer rounded border px-2 py-1 text-xs ${
                    checked ? "border-emerald-500 bg-emerald-900/40" : "border-zinc-700 bg-zinc-900"
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(cat, v)} />
                  {v} <span className="text-zinc-500">({count})</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write Ranking route**

Create `web/src/routes/Ranking.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FixedSizeList as List } from "react-window";
import { TraitFilters } from "../components/TraitFilters";
import { applyFilters, searchById, sortByRank, type TraitFilter } from "../lib/filters";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Ranking({ bundle }: Props) {
  const [filter, setFilter] = useState<TraitFilter>({});
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (query.trim()) {
      const hit = searchById(bundle.upegs.items, query);
      return hit ? [hit] : [];
    }
    return sortByRank(applyFilters(bundle.upegs.items, filter));
  }, [bundle, filter, query]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <input
          type="text"
          placeholder="Search by ID..."
          className="mb-4 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <TraitFilters trait_frequencies={bundle.stats.trait_frequencies} value={filter} onChange={setFilter} />
      </aside>
      <main>
        <p className="mb-4 text-sm text-zinc-400">
          Showing {filtered.length} of {bundle.upegs.total_minted}
        </p>
        <List height={600} itemCount={filtered.length} itemSize={68} width="100%">
          {({ index, style }) => {
            const item = filtered[index];
            return (
              <div style={style} className="flex items-center gap-4 border-b border-zinc-900 px-2">
                <span className="w-12 text-right font-mono text-zinc-400">#{item.rank}</span>
                <div
                  className="h-12 w-12 [image-rendering:pixelated]"
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
                <Link to={`/upeg/${item.id}`} className="font-mono hover:underline">
                  #{item.id}
                </Link>
                <span className="text-sm text-zinc-400">score {item.score.toFixed(2)}</span>
                <div className="ml-auto flex flex-wrap gap-1 text-xs">
                  {Object.entries(item.traits).map(([k, v]) => (
                    <span key={k} className="rounded bg-zinc-800 px-2 py-0.5">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }}
        </List>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write smoke test**

Create `web/src/routes/Ranking.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Ranking } from "./Ranking";
import type { DataBundle } from "../types";

const bundle: DataBundle = {
  upegs: {
    generated_at: "x", block: 1, total_minted: 1,
    items: [{ id: 1, owner: "0xa", traits: { color: "red" }, score: 2, rank: 1, svg: "<svg/>" }],
  },
  stats: { total_minted: 1, trait_frequencies: { color: { red: 1 } } },
  meta: { generated_at: "x", block: 1, total_minted: 1, data_hash: "h" },
  byId: new Map([[1, { id: 1, owner: "0xa", traits: { color: "red" }, score: 2, rank: 1, svg: "<svg/>" }]]),
  byOwner: new Map(),
};

test("renders count and the single item", () => {
  render(
    <MemoryRouter>
      <Ranking bundle={bundle} />
    </MemoryRouter>
  );
  expect(screen.getByText(/Showing 1 of 1/)).toBeInTheDocument();
});
```

- [ ] **Step 4: Run, verify pass**

```bash
cd web
npm test -- --run src/routes/Ranking.test.tsx
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/routes/Ranking.tsx web/src/routes/Ranking.test.tsx web/src/components/TraitFilters.tsx
git commit -m "feat(web): ranking route with trait filters and virtualized table"
```

---

## Task 14: Detail Route

**Files:**
- Create: `web/src/routes/Detail.tsx`, `web/src/routes/Detail.test.tsx`

- [ ] **Step 1: Write route**

Create `web/src/routes/Detail.tsx`:

```tsx
import { Link, useParams } from "react-router-dom";
import { TraitChip } from "../components/TraitChip";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Detail({ bundle }: Props) {
  const { id } = useParams<{ id: string }>();
  const item = id != null ? bundle.byId.get(Number(id)) : undefined;

  if (!item) {
    return (
      <div className="text-zinc-400">
        Upeg #{id} not found. <Link className="underline" to="/">Back to ranking</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <div
        className="aspect-square w-full rounded-lg border border-zinc-800 bg-zinc-900 [image-rendering:pixelated]"
        dangerouslySetInnerHTML={{ __html: item.svg }}
      />
      <div>
        <h2 className="font-mono text-3xl">uPEG #{item.id}</h2>
        <p className="mt-1 text-zinc-400">Rank {item.rank} · Score {item.score.toFixed(3)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(item.traits).map(([k, v]) => (
            <TraitChip
              key={k}
              label={k}
              value={v}
              frequency={bundle.stats.trait_frequencies[k]?.[String(v)] != null
                ? bundle.stats.trait_frequencies[k][String(v)] / bundle.stats.total_minted
                : undefined}
            />
          ))}
        </div>
        <p className="mt-6 text-sm text-zinc-400">
          Holder:{" "}
          <Link className="font-mono underline" to={`/holder/${item.owner}`}>
            {item.owner}
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write smoke test**

Create `web/src/routes/Detail.test.tsx`:

```tsx
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

test("renders id, rank, score, holder", () => {
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
```

- [ ] **Step 3: Run, verify pass**

```bash
cd web
npm test -- --run src/routes/Detail.test.tsx
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/routes/Detail.tsx web/src/routes/Detail.test.tsx
git commit -m "feat(web): NFT detail route"
```

---

## Task 15: Holder Route

**Files:**
- Create: `web/src/routes/Holder.tsx`, `web/src/routes/Holder.test.tsx`

- [ ] **Step 1: Write route**

Create `web/src/routes/Holder.tsx`:

```tsx
import { Link, useParams } from "react-router-dom";
import { UpegCard } from "../components/UpegCard";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Holder({ bundle }: Props) {
  const { addr } = useParams<{ addr: string }>();
  const norm = (addr ?? "").toLowerCase();
  const items = bundle.byOwner.get(norm) ?? [];

  return (
    <div>
      <h2 className="font-mono text-2xl">{addr}</h2>
      <p className="mt-1 text-zinc-400">{items.length} uPEG{items.length === 1 ? "" : "s"}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-zinc-500">No uPEGs at this address.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {items.map((u) => (
            <Link key={u.id} to={`/upeg/${u.id}`}>
              <UpegCard upeg={u} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write smoke test**

Create `web/src/routes/Holder.test.tsx`:

```tsx
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
```

- [ ] **Step 3: Run, verify pass**

```bash
cd web
npm test -- --run src/routes/Holder.test.tsx
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/routes/Holder.tsx web/src/routes/Holder.test.tsx
git commit -m "feat(web): holder route"
```

---

## Task 16: Stats Route (with Recharts)

**Files:**
- Create: `web/src/routes/Stats.tsx`, `web/src/routes/Stats.test.tsx`

- [ ] **Step 1: Write route**

Create `web/src/routes/Stats.tsx`:

```tsx
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { DataBundle } from "../types";

interface Props {
  bundle: DataBundle;
}

export function Stats({ bundle }: Props) {
  const total = bundle.stats.total_minted;
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold">Collection Stats</h2>
        <p className="mt-1 text-zinc-400">
          {total} minted as of block {bundle.meta.block}
        </p>
      </header>
      {Object.entries(bundle.stats.trait_frequencies).map(([cat, vals]) => {
        const data = Object.entries(vals)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count);
        return (
          <section key={cat}>
            <h3 className="mb-2 text-lg font-semibold capitalize">{cat}</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 24)}>
              <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" stroke="#71717a" />
                <YAxis dataKey="value" type="category" stroke="#71717a" width={80} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write smoke test**

Create `web/src/routes/Stats.test.tsx`:

```tsx
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
```

- [ ] **Step 3: Run, verify pass**

```bash
cd web
npm test -- --run src/routes/Stats.test.tsx
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/routes/Stats.tsx web/src/routes/Stats.test.tsx
git commit -m "feat(web): stats route with bar charts"
```

---

## Task 17: Wire Routing + Loading State

**Files:**
- Modify: `web/src/App.tsx`, `web/src/main.tsx`
- Update test: `web/src/App.test.tsx`

- [ ] **Step 1: Update App.tsx**

Replace `web/src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { loadBundle } from "./lib/data";
import { Ranking } from "./routes/Ranking";
import { Detail } from "./routes/Detail";
import { Holder } from "./routes/Holder";
import { Stats } from "./routes/Stats";
import type { DataBundle } from "./types";

export default function App() {
  const [bundle, setBundle] = useState<DataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBundle().then(setBundle).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">uPEG Rarity</Link>
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link to="/" className="hover:text-zinc-100">Ranking</Link>
          <Link to="/stats" className="hover:text-zinc-100">Stats</Link>
        </nav>
      </header>
      {error && <p className="text-red-400">Failed to load data: {error}</p>}
      {!bundle && !error && <p className="text-zinc-400">Loading…</p>}
      {bundle && (
        <Routes>
          <Route path="/" element={<Ranking bundle={bundle} />} />
          <Route path="/upeg/:id" element={<Detail bundle={bundle} />} />
          <Route path="/holder/:addr" element={<Holder bundle={bundle} />} />
          <Route path="/stats" element={<Stats bundle={bundle} />} />
        </Routes>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update main.tsx to wrap with BrowserRouter**

Replace `web/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Update App.test.tsx to handle async**

Replace `web/src/App.test.tsx`:

```tsx
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
```

- [ ] **Step 4: Run dev server + manual smoke**

```bash
cd web
npm run dev &
sleep 3
curl -sf http://localhost:5173/upegs.json | head -c 200
kill %1
```

Expected: returns the first ~200 chars of the JSON. If empty, check `publicDir` config from Task 9.

- [ ] **Step 5: Run all tests**

```bash
cd web
npm test -- --run
```

Expected: all frontend tests pass.

- [ ] **Step 6: Commit**

```bash
cd /g/claude/upeg-rarity
git add web/src/App.tsx web/src/main.tsx web/src/App.test.tsx
git commit -m "feat(web): wire routing + data loading state"
```

---

## Task 18: GitHub Actions — Hourly Refresh Workflow

**Files:**
- Create: `.github/workflows/refresh.yml`

- [ ] **Step 1: Write workflow**

Create `.github/workflows/refresh.yml`:

```yaml
name: Refresh data

on:
  schedule:
    - cron: "0 * * * *"  # hourly
  workflow_dispatch:

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install pipeline
        run: pip install -r requirements.txt

      - name: Run pipeline
        env:
          RPC_URLS: ${{ secrets.RPC_URLS || 'https://eth.llamarpc.com,https://rpc.ankr.com/eth,https://cloudflare-eth.com' }}
        run: python -m pipeline

      - name: Commit data if changed
        run: |
          git config user.name "upeg-rarity-bot"
          git config user.email "actions@github.com"
          if [[ -n "$(git status --porcelain data/)" ]]; then
            git add data/
            git commit -m "data: hourly refresh $(date -u +%FT%TZ)"
            git push
          else
            echo "No data changes"
          fi
```

- [ ] **Step 2: Commit**

```bash
cd /g/claude/upeg-rarity
git add .github/workflows/refresh.yml
git commit -m "ci: hourly data refresh workflow"
```

---

## Task 19: GitHub Actions — CI Workflow (tests + build on PR/push)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  python-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
      - run: pip install -r requirements-dev.txt
      - run: pytest

  web-tests-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
cd /g/claude/upeg-rarity
git add .github/workflows/ci.yml
git commit -m "ci: pytest + frontend build on push/PR"
```

---

## Task 20: README + Cloudflare Pages Deployment

**Files:**
- Create: `README.md`
- Modify: `web/vite.config.ts` for production base path (already `./`)
- Add: `web/public/_redirects` for SPA routing

- [ ] **Step 1: Write `_redirects`**

Create `web/public/_redirects`:

```
/*  /index.html  200
```

This makes Cloudflare Pages serve the SPA for all client-side routes.

- [ ] **Step 2: Confirm production build copies data**

Modify `web/package.json` build script to also copy `data/` into dist:

Replace the `"scripts"` block in `web/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build && node -e \"require('node:fs').cpSync('../data', 'dist', { recursive: true })\"",
  "preview": "vite preview",
  "test": "vitest"
}
```

- [ ] **Step 3: Verify build**

```bash
cd web
npm run build
ls dist/
# expect: index.html, assets/, upegs.json, stats.json, meta.json, _redirects
```

- [ ] **Step 4: Write README**

Create `README.md`:

````markdown
# uPEG Rarity

Public, zero-cost rarity explorer for [Unipeg (uPEG)](https://etherscan.io/address/0x44b28991b167582f18ba0259e0173176ca125505) — a hybrid ERC-20 / on-chain-NFT collection on Uniswap v4 Hooks.

## Architecture

- **Pipeline** (`pipeline/`): Hourly Python job that scans Transfer events, decodes `tokenURI`, computes [OpenRarity](https://github.com/ProjectOpenSea/open-rarity) Information Content scores, and writes JSON to `data/`.
- **Frontend** (`web/`): Vite + React static SPA that loads `data/upegs.json` once and does all filter/sort/search client-side.
- **CI/CD**: GitHub Actions runs the pipeline on cron (`refresh.yml`); Cloudflare Pages auto-deploys the SPA on every push.

## Local dev

```bash
# 1. Pipeline
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements-dev.txt
pytest                    # run pipeline tests
python -m pipeline        # produce data/

# 2. Frontend
cd web
npm install
npm test                  # run frontend tests
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

- **Address:** `0x44b28991b167582f18ba0259e0173176ca125505`
- **Trait extraction strategy:** see `docs/phase0-findings.md`
- **Design doc:** `docs/superpowers/specs/2026-05-01-upeg-rarity-design.md`
````

- [ ] **Step 5: Commit**

```bash
cd /g/claude/upeg-rarity
git add README.md web/public/_redirects web/package.json
git commit -m "docs: README + Cloudflare Pages SPA routing config"
```

- [ ] **Step 6: Final verification**

```bash
cd /g/claude/upeg-rarity
pytest                                              # pipeline tests
cd web && npm test -- --run && npm run build       # frontend
ls dist/                                             # confirm build artifacts
```

All green → ready to push to GitHub and connect to Cloudflare Pages per README.

---

## Done Criteria (from spec §13)

After Task 20, manually verify:

- ✅ Phase 0 findings doc exists at `docs/phase0-findings.md`
- ✅ `pytest` passes (Python pipeline)
- ✅ `npm test -- --run` passes (frontend)
- ✅ `python -m pipeline` produces valid `data/upegs.json` against mainnet
- ✅ Site deployed at `<project>.pages.dev` and all four routes render
- ✅ At least one hourly cron run completed successfully (check GitHub Actions tab)
