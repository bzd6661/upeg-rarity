"""OpenRarity-style Information Content rarity scoring.

For each token: score = Σ_t  weight_t × −log2( freq(token.traits[t]) )
Higher score = rarer. Ranks are dense (ties share a rank, next rank skips).

For some traits we override the IC formula with explicit value-based bonuses
(see TRAIT_VALUE_BONUS) — used when the rarity semantics aren't symmetric
in frequency (e.g., low color counts are valued more than high color counts
even when both are equally uncommon).
"""
from __future__ import annotations

import math
from collections import Counter
from typing import Any


# Per-trait weight overrides for IC scoring. Default is 1.0 for any trait
# not listed here. Weight 0.0 means the trait is excluded from rarity scoring
# entirely (still counted in stats.json frequencies for the UI).
#
# Color slots have weight 0 because individual color choices are not
# intrinsically rare — color rarity is captured by n_distinct_colors via
# TRAIT_VALUE_BONUS instead.
TRAIT_WEIGHTS: dict[str, float] = {
    "backGroundColor": 0.0,
    "bodyColor": 0.0,
    "hornColor": 0.0,
    "eyesColor": 0.0,
    "tailColor": 0.0,
    "hairColor": 0.0,
    "groundColor": 0.0,
    "accessoriesColor": 0.0,
    # n_distinct_colors uses TRAIT_VALUE_BONUS instead of weighted IC
    "n_distinct_colors": 0.0,
}


# Value-based score overrides. When a trait appears as a key here, its IC
# contribution comes from this lookup keyed by the observed value, NOT from
# -log2(p). Values not listed in the inner dict contribute 0.
#
# n_distinct_colors: low color counts (2, 3) and "full spectrum" (7) get
# explicit boosts. Middle values (4, 5, 6) are unremarkable and contribute 0.
TRAIT_VALUE_BONUS: dict[str, dict[Any, float]] = {
    "n_distinct_colors": {
        2: 50.0,  # bichrome — rarest pattern, top tier
        3: 30.0,  # tri-chrome — second tier
        7: 15.0,  # full spectrum — third tier (some boost, less than 3)
        # 4, 5, 6 → no bonus (middle values are unremarkable)
    },
}


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
        # Value-based bonus override (if any)
        if k in TRAIT_VALUE_BONUS:
            score += TRAIT_VALUE_BONUS[k].get(v, 0.0)
            continue
        # Standard weighted IC
        weight = TRAIT_WEIGHTS.get(k, 1.0)
        if weight == 0:
            continue
        p = freqs.get(k, {}).get(v)
        if p is None or p <= 0:
            continue
        score += weight * -math.log2(p)
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
