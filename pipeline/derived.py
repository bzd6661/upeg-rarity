"""Compute derived traits that capture cross-trait patterns the raw
on-chain values don't surface directly.

Two categories of derived traits:
  - has_<trait>: 1 if the shape trait is present (value != 0), 0 if absent.
    Only emitted for shape traits where 0 means "absent".
  - n_distinct_colors: count of unique fill colors in the rendered SVG.
    This is the perceptually correct count — the on-chain renderer uses
    accent colors (highlights, shadows) that aren't sourced from any
    single trait slot, so we parse the actual SVG output.

Naming convention: derived traits start with `has_` (boolean) or `n_`
(numeric category). The frontend uses these prefixes to render them
differently from on-chain traits.
"""
from __future__ import annotations

import re

# Shape traits whose value=0 means "absent"
PRESENCE_TRAITS = ("horn", "wings", "legsBack", "hair", "accessories")

# Matches `fill="#abc"` or `fill='#abcdef'` etc. Case-insensitive on the hex.
_FILL_PATTERN = re.compile(r'fill\s*=\s*["\']\s*(#[0-9a-fA-F]+)\s*["\']')


def count_svg_colors(svg: str) -> int:
    """Count distinct fill colors in an SVG string."""
    fills = _FILL_PATTERN.findall(svg)
    # Normalize hex case so #ABC and #abc count as the same color
    normalized = {f.lower() for f in fills}
    return len(normalized)


def add_derived_traits(traits: dict, svg: str = "") -> dict:
    """Return a new dict containing all of `traits` plus derived entries.

    Args:
        traits: on-chain trait values (uint8 fields)
        svg:    rendered on-chain SVG, used for n_distinct_colors

    Does NOT mutate the input.
    """
    out = dict(traits)
    for t in PRESENCE_TRAITS:
        if t in traits:
            out[f"has_{t}"] = 1 if traits[t] != 0 else 0
    if svg:
        out["n_distinct_colors"] = count_svg_colors(svg)
    return out
