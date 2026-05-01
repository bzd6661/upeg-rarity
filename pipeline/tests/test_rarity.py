"""Tests for pipeline.rarity — IC scoring + tier-based ranking."""
import math
import pytest
from pipeline.rarity import (
    N_DISTINCT_COLORS_TIERS,
    TRAIT_WEIGHTS,
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


def test_color_slot_traits_excluded_from_ic():
    items = [
        {"id": 1, "traits": {"bodyColor": "rare", "horn": "rare"}},
        {"id": 2, "traits": {"bodyColor": "common", "horn": "common"}},
        {"id": 3, "traits": {"bodyColor": "common", "horn": "common"}},
    ]
    freqs = compute_trait_frequencies(items)
    # bodyColor weight=0 → only horn drives the score
    ic = compute_information_content(items[0]["traits"], freqs)
    assert ic == pytest.approx(math.log2(3))


def test_n_distinct_colors_excluded_from_ic():
    # n_distinct_colors weight=0 — its rarity comes from tier ordering, not IC
    items = [
        {"id": 1, "traits": {"n_distinct_colors": 2}},
        {"id": 2, "traits": {"n_distinct_colors": 5}},
        {"id": 3, "traits": {"n_distinct_colors": 5}},
    ]
    freqs = compute_trait_frequencies(items)
    ic = compute_information_content(items[0]["traits"], freqs)
    assert ic == pytest.approx(0.0)


def test_tier_ordering_strict_2_then_3_then_7():
    # Construct items where 7-color has high IC and 3-color has low IC.
    # Strict tier ordering must still place ALL 3-colors before any 7-color.
    items = [
        # 7-color, otherwise rare → high IC
        {"id": 1, "traits": {"n_distinct_colors": 7, "horn": "ultra_rare"}},
        # 3-color, common → low IC
        {"id": 2, "traits": {"n_distinct_colors": 3, "horn": "common"}},
        # Filler so frequencies make sense
        {"id": 3, "traits": {"n_distinct_colors": 7, "horn": "common"}},
        {"id": 4, "traits": {"n_distinct_colors": 7, "horn": "common"}},
        {"id": 5, "traits": {"n_distinct_colors": 5, "horn": "common"}},
    ]
    ranked = rank_collection(items)
    by_id = {r["id"]: r for r in ranked}
    # 3-color (id=2) must come before any 7-color, regardless of its IC
    assert by_id[2]["rank"] < by_id[1]["rank"]
    assert by_id[2]["rank"] < by_id[3]["rank"]


def test_tier_ordering_2_above_3_above_7_above_others():
    items = [
        {"id": 1, "traits": {"n_distinct_colors": 7}},  # tier 2
        {"id": 2, "traits": {"n_distinct_colors": 4}},  # fallback tier
        {"id": 3, "traits": {"n_distinct_colors": 2}},  # tier 0 — top
        {"id": 4, "traits": {"n_distinct_colors": 3}},  # tier 1
        {"id": 5, "traits": {"n_distinct_colors": 5}},  # fallback tier
        {"id": 6, "traits": {"n_distinct_colors": 6}},  # fallback tier
    ]
    ranked = rank_collection(items)
    by_id = {r["id"]: r for r in ranked}
    assert by_id[3]["rank"] == 1                  # 2-color first
    assert by_id[4]["rank"] < by_id[1]["rank"]    # 3 before 7
    assert by_id[1]["rank"] < by_id[2]["rank"]    # 7 before 4
    assert by_id[1]["rank"] < by_id[5]["rank"]    # 7 before 5
    assert by_id[1]["rank"] < by_id[6]["rank"]    # 7 before 6


def test_within_tier_higher_ic_ranks_higher():
    # Both 2-color, but one has rare horn → should rank higher within tier 0
    items = [
        {"id": 1, "traits": {"n_distinct_colors": 2, "horn": "rare"}},
        {"id": 2, "traits": {"n_distinct_colors": 2, "horn": "common"}},
        {"id": 3, "traits": {"n_distinct_colors": 2, "horn": "common"}},
    ]
    ranked = rank_collection(items)
    by_id = {r["id"]: r for r in ranked}
    assert by_id[1]["rank"] == 1  # rare horn → top
    assert by_id[2]["rank"] == 2
    assert by_id[3]["rank"] == 2  # tied with id=2


def test_rank_handles_empty_collection():
    assert rank_collection([]) == []


def test_constants_locked():
    # n_distinct_colors weight 0 (tier-based, not IC-based)
    assert TRAIT_WEIGHTS["n_distinct_colors"] == 0.0
    assert TRAIT_WEIGHTS["bodyColor"] == 0.0
    # Tier assignments
    assert N_DISTINCT_COLORS_TIERS[2] == 0
    assert N_DISTINCT_COLORS_TIERS[3] == 1
    assert N_DISTINCT_COLORS_TIERS[7] == 2
    # 4, 5, 6 not in dict → fallback tier
    assert 4 not in N_DISTINCT_COLORS_TIERS
    assert 5 not in N_DISTINCT_COLORS_TIERS
    assert 6 not in N_DISTINCT_COLORS_TIERS
