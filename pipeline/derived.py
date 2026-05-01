"""Compute derived traits that capture cross-trait patterns the raw
on-chain values don't surface directly.

Two categories of derived traits:
  - has_<trait>: 1 if the shape trait is present (value != 0), 0 if absent.
    Only emitted for shape traits where 0 means "absent". Excludes traits
    where every NFT has a non-zero value (tail, legsFront).
  - n_distinct_colors: number of unique colors across the visible color
    slots. A color slot is only counted when its gating shape trait is
    present (non-zero). Slots without a gate (body/eyes/tail) are always
    counted.

Naming convention: derived traits start with `has_` (boolean) or `n_`
(numeric category). The frontend uses these prefixes to render them
differently from on-chain traits.
"""
from __future__ import annotations

# Shape traits whose value=0 means "absent"
PRESENCE_TRAITS = ("horn", "wings", "legsBack", "hair", "accessories")

# Color slot → optional shape trait that gates its visibility.
# If the gating shape value is 0 (= absent), the color slot is invisible
# in the rendered SVG and should NOT count toward n_distinct_colors.
# Slots without a gate (body/eyes/tail) are always visible.
_COLOR_VISIBILITY_GATES: dict[str, str | None] = {
    "bodyColor": None,            # body always present (body=1 for all)
    "eyesColor": None,            # eyes always present
    "tailColor": None,            # tail always present (never 0)
    "hornColor": "horn",
    "wingsColor": "wings",
    "accessoriesColor": "accessories",
    "hairColor": "hair",
}

# Public re-export — frontend & docs may reference this list
COLOR_SLOTS = tuple(_COLOR_VISIBILITY_GATES.keys())


def _visible_colors(traits: dict) -> list:
    """Return the values of color slots whose gating shape is present (or ungated)."""
    out = []
    for slot, gate in _COLOR_VISIBILITY_GATES.items():
        if slot not in traits:
            continue
        if gate is not None and traits.get(gate, 0) == 0:
            continue
        out.append(traits[slot])
    return out


def add_derived_traits(traits: dict) -> dict:
    """Return a new dict containing all of `traits` plus derived entries.

    Does NOT mutate the input.
    """
    out = dict(traits)
    for t in PRESENCE_TRAITS:
        if t in traits:
            out[f"has_{t}"] = 1 if traits[t] != 0 else 0
    visible = _visible_colors(traits)
    if visible:
        out["n_distinct_colors"] = len(set(visible))
    return out
