"""OpenRarity-style rarity scoring with strict tier-based ordering on color count.

For each token: score = Σ_t  weight_t × −log2( freq(token.traits[t]) )
Higher score = rarer within its tier.

n_distinct_colors does NOT contribute to the score directly. Instead, items
are ranked by (tier, -score), where tier is determined by n_distinct_colors
per N_DISTINCT_COLORS_TIERS. ALL items in tier 0 rank above ALL items in
tier 1, regardless of their underlying scores.
"""
from __future__ import annotations

import math
from collections import Counter
from typing import Any


# Per-trait weight overrides for IC scoring. Default is 1.0 for any trait
# not listed here. Weight 0.0 means the trait is excluded from rarity scoring
# entirely (still counted in stats.json frequencies for the UI).
TRAIT_WEIGHTS: dict[str, float] = {
    "backGroundColor": 0.0,
    "bodyColor": 0.0,
    "hornColor": 0.0,
    "eyesColor": 0.0,
    "tailColor": 0.0,
    "hairColor": 0.0,
    "groundColor": 0.0,
    "accessoriesColor": 0.0,
    # n_distinct_colors does NOT contribute to score (it determines TIER instead)
    "n_distinct_colors": 0.0,
}


# Tier assignment by n_distinct_colors value. Lower tier = higher overall rank.
# Items not in this dict (or missing n_distinct_colors entirely) get the
# fallback tier defined below.
N_DISTINCT_COLORS_TIERS: dict[int, int] = {
    2: 0,  # bichrome — top tier
    3: 1,  # tri-chrome — second
    7: 2,  # full spectrum — third
    # 4, 5, 6 → fallback tier
}
_FALLBACK_TIER: int = 99


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
        weight = TRAIT_WEIGHTS.get(k, 1.0)
        if weight == 0:
            continue
        p = freqs.get(k, {}).get(v)
        if p is None or p <= 0:
            continue
        score += weight * -math.log2(p)
    return score


def _tier_for(traits: dict) -> int:
    """Return the tier index for an item based on n_distinct_colors."""
    n = traits.get("n_distinct_colors")
    if n is None:
        return _FALLBACK_TIER
    return N_DISTINCT_COLORS_TIERS.get(n, _FALLBACK_TIER)


def rank_collection(items: list[dict]) -> list[dict]:
    """Annotate each item with `score` and `rank`.

    Sort key: (tier ascending, score descending). Within a tier, higher
    score ranks higher. Rank values are dense (ties share a rank, next
    rank skips by tie count).
    """
    if not items:
        return []
    freqs = compute_trait_frequencies(items)
    scored = [
        {
            **item,
            "score": compute_information_content(item["traits"], freqs),
        }
        for item in items
    ]

    # Sort by tier ascending, then score descending
    scored.sort(key=lambda x: (_tier_for(x["traits"]), -x["score"]))

    # Rank: ties share a rank when (tier, score) tuple is equal
    rank = 0
    last_key: tuple | None = None
    next_rank_value = 1
    for idx, item in enumerate(scored, start=1):
        key = (_tier_for(item["traits"]), item["score"])
        if key != last_key:
            rank = next_rank_value
            last_key = key
        item["rank"] = rank
        next_rank_value = idx + 1
    return scored
