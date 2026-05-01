"""Tests for pipeline.rarity — Information Content scoring + ranking."""
import math
import pytest
from pipeline.rarity import (
    compute_trait_frequencies,
    compute_information_content,
    rank_collection,
    TRAIT_WEIGHTS,
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


def test_trait_weights_zero_excludes_from_score():
    items = [
        {"id": 1, "traits": {"bodyColor": "rare", "horn": "rare"}},
        {"id": 2, "traits": {"bodyColor": "common", "horn": "common"}},
        {"id": 3, "traits": {"bodyColor": "common", "horn": "common"}},
    ]
    freqs = compute_trait_frequencies(items)
    # bodyColor has weight 0 → contributes nothing. Only horn drives the score.
    ic = compute_information_content(items[0]["traits"], freqs)
    assert ic == pytest.approx(math.log2(3))


def test_n_distinct_colors_uses_value_bonus_not_ic():
    # Even though both populations have the same frequency (1/3), the bonus
    # values differ because they're hardcoded by value, not derived from IC.
    items_2color = [
        {"id": 1, "traits": {"n_distinct_colors": 2}},
        {"id": 2, "traits": {"n_distinct_colors": 5}},
        {"id": 3, "traits": {"n_distinct_colors": 5}},
    ]
    freqs = compute_trait_frequencies(items_2color)
    ic_2 = compute_information_content(items_2color[0]["traits"], freqs)
    ic_5 = compute_information_content(items_2color[1]["traits"], freqs)
    # n=2 → 50.0 (bonus), n=5 → 0 (no bonus despite being equally frequent)
    assert ic_2 == pytest.approx(50.0)
    assert ic_5 == pytest.approx(0.0)


def test_n_distinct_colors_bonus_ordering():
    # Verify the 2 < 3 < 7 < {4,5,6} priority encoded by user
    from pipeline.rarity import TRAIT_VALUE_BONUS
    bonus = TRAIT_VALUE_BONUS["n_distinct_colors"]
    assert bonus[2] > bonus[3] > bonus[7]
    # 4, 5, 6 not in dict → 0 bonus
    assert 4 not in bonus
    assert 5 not in bonus
    assert 6 not in bonus


def test_constants_locked():
    from pipeline.rarity import TRAIT_WEIGHTS, TRAIT_VALUE_BONUS
    # Color slots: weight 0 (excluded from IC)
    assert TRAIT_WEIGHTS["bodyColor"] == 0.0
    assert TRAIT_WEIGHTS["backGroundColor"] == 0.0
    assert TRAIT_WEIGHTS["hairColor"] == 0.0
    # n_distinct_colors uses value bonuses, not IC
    assert TRAIT_WEIGHTS["n_distinct_colors"] == 0.0
    assert TRAIT_VALUE_BONUS["n_distinct_colors"][2] == 50.0
    assert TRAIT_VALUE_BONUS["n_distinct_colors"][3] == 30.0
    assert TRAIT_VALUE_BONUS["n_distinct_colors"][7] == 15.0
