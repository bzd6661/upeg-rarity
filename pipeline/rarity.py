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
