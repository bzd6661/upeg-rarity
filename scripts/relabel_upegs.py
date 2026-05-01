"""
One-shot relabeling script for upegs.json.

Renames trait keys from the old (buggy) TRAIT_FIELDS order to the corrected
order verified against the Etherscan ABI for the hook contract.

Shape key mapping (positional swap of labels):
    horn        -> hair
    wings       -> horn
    tail        -> legsBack
    legsBack    -> wings
    accessories -> tail
    hair        -> accessories

Color key mapping:
    hornColor   -> eyesColor
    wingsColor  -> hairColor
    tailColor   -> hornColor
    hairColor   -> groundColor
    eyesColor   -> tailColor
    bodyColor       unchanged
    accessoriesColor unchanged

Derived traits (has_*, n_distinct_colors) are recomputed from the corrected
base traits using add_derived_traits.
"""

import json
import sys
from pathlib import Path

# Ensure pipeline package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipeline.derived import add_derived_traits

SHAPE_REMAP = {
    "horn": "hair",
    "wings": "horn",
    "tail": "legsBack",
    "legsBack": "wings",
    "accessories": "tail",
    "hair": "accessories",
}

COLOR_REMAP = {
    "hornColor": "eyesColor",
    "wingsColor": "hairColor",
    "tailColor": "hornColor",
    "hairColor": "groundColor",
    "eyesColor": "tailColor",
    # bodyColor, accessoriesColor unchanged
}

# Keys that are derived (computed), not stored raw on-chain
DERIVED_PREFIXES = ("has_", "n_")


def relabel_item_traits(traits: dict, svg: str) -> dict:
    """Return corrected traits dict with renamed keys and recomputed derived traits."""
    # Step 1: remove all derived traits; we'll recompute them
    base = {k: v for k, v in traits.items()
            if not any(k.startswith(p) for p in DERIVED_PREFIXES)}

    # Step 2: rename shape and color keys
    all_remap = {**SHAPE_REMAP, **COLOR_REMAP}
    renamed = {}
    for k, v in base.items():
        new_key = all_remap.get(k, k)
        renamed[new_key] = v

    # Step 3: strip ground (no variants, excluded from rarity scoring)
    cleaned = {k: v for k, v in renamed.items() if k != "ground"}

    # Step 4: recompute derived traits from the SVG
    return add_derived_traits(cleaned, svg=svg)


def main():
    data_dir = Path(__file__).resolve().parent.parent / "data"
    upegs_path = data_dir / "upegs.json"

    print(f"Reading {upegs_path} ...")
    payload = json.loads(upegs_path.read_text())
    items = payload["items"]
    print(f"  {len(items)} items loaded")

    # Relabel traits on every item
    for item in items:
        item["traits"] = relabel_item_traits(item["traits"], item.get("svg", ""))

    # Re-rank using pipeline.rarity (preserves existing rank logic)
    from pipeline.rarity import rank_collection
    ranked = rank_collection(items)
    print(f"  Re-ranked {len(ranked)} items")

    # Rebuild emit payload (preserve block + generated_at from old run)
    from pipeline.emit import emit_all
    emit_all(data_dir, ranked, block=payload.get("block", 0))
    print(f"  Wrote updated upegs.json / stats.json / meta.json to {data_dir}")

    # Print token 33855 for verification
    token = next((i for i in ranked if i["id"] == 33855), None)
    if token:
        print("\n--- Token 33855 traits (after relabeling) ---")
        import pprint
        pprint.pprint(token["traits"])
        print(f"  rank={token['rank']}")
    else:
        print("WARNING: token 33855 not found in output")

    # Top 10 ranks
    print("\n--- Top 10 by rank ---")
    top10 = sorted(ranked, key=lambda x: x["rank"])[:10]
    for t in top10:
        print(f"  rank={t['rank']}  id={t['id']}  score={t['score']:.4f}")


if __name__ == "__main__":
    main()
