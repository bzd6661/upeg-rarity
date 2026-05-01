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

from pipeline.derived import add_derived_traits
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
        # "ground" has groundCount=0 (no variants) — excluded from rarity scoring.
        cleaned = {k: v for k, v in base["traits"].items() if k != "ground"}
        base["traits"] = add_derived_traits(cleaned)
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
