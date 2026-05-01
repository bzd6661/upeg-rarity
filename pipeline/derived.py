"""Compute derived traits that capture cross-trait patterns the raw
on-chain values don't surface directly.

Two categories of derived traits:
  - has_<trait>: 1 if the shape trait is present (value != 0), 0 if absent.
    Only emitted for shape traits where 0 means "absent". Excludes traits
    where every NFT has a non-zero value (tail, legsFront).
  - n_distinct_colors: number of unique colors across the 6 main color
    slots (excludes hairColor since it's currently always 0).

Naming convention: derived traits start with `has_` (boolean) or `n_`
(numeric category). The frontend uses these prefixes to render them
differently from on-chain traits.
"""
from __future__ import annotations

# Shape traits whose value=0 means "absent"
PRESENCE_TRAITS = ("horn", "wings", "legsBack", "hair", "accessories")

# Color slots used to compute n_distinct_colors (excludes hairColor — always 0)
COLOR_SLOTS = (
    "bodyColor",
    "hornColor",
    "wingsColor",
    "tailColor",
    "accessoriesColor",
    "eyesColor",
)


def add_derived_traits(traits: dict) -> dict:
    """Return a new dict containing all of `traits` plus derived entries.

    Does NOT mutate the input.
    """
    out = dict(traits)
    for t in PRESENCE_TRAITS:
        if t in traits:
            out[f"has_{t}"] = 1 if traits[t] != 0 else 0
    color_values = [traits[c] for c in COLOR_SLOTS if c in traits]
    if color_values:
        out["n_distinct_colors"] = len(set(color_values))
    return out
