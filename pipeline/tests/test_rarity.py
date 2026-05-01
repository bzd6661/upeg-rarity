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
    assert ic == pytest.approx(math.log2(3))  # only horn's -log2(1/3)


def test_n_distinct_colors_weighted_5x():
    items = [
        {"id": 1, "traits": {"n_distinct_colors": 2}},
        {"id": 2, "traits": {"n_distinct_colors": 6}},
        {"id": 3, "traits": {"n_distinct_colors": 6}},
    ]
    freqs = compute_trait_frequencies(items)
    ic_rare = compute_information_content(items[0]["traits"], freqs)
    # 5x weight × -log2(1/3) for the 2-color case
    assert ic_rare == pytest.approx(5.0 * math.log2(3))


def test_weight_constants_locked():
    # Lock the weights table — changing these alters scoring semantics.
    assert TRAIT_WEIGHTS["bodyColor"] == 0.0
    assert TRAIT_WEIGHTS["backGroundColor"] == 0.0
    assert TRAIT_WEIGHTS["hairColor"] == 0.0
    assert TRAIT_WEIGHTS["n_distinct_colors"] == 5.0
