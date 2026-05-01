"""Tests for pipeline.derived — derived trait computation."""
from pipeline.derived import add_derived_traits, PRESENCE_TRAITS, COLOR_SLOTS


def test_has_present_when_value_nonzero():
    traits = {"horn": 5, "wings": 0, "tail": 3, "legsFront": 1, "legsBack": 0,
              "accessories": 2, "hair": 0,
              "backGroundColor": 1, "body": 1, "eyes": 1, "ground": 0,
              "bodyColor": 10, "hornColor": 10, "wingsColor": 10,
              "tailColor": 10, "accessoriesColor": 10, "eyesColor": 10}
    out = add_derived_traits(traits)
    assert out["has_horn"] == 1
    assert out["has_wings"] == 0
    assert out["has_legsBack"] == 0
    assert out["has_hair"] == 0
    assert out["has_accessories"] == 1


def test_n_distinct_colors_counts_unique_color_values():
    traits = {"bodyColor": 5, "hornColor": 5, "wingsColor": 5, "tailColor": 5,
              "accessoriesColor": 5, "eyesColor": 5}
    out = add_derived_traits(traits)
    assert out["n_distinct_colors"] == 1


def test_n_distinct_colors_with_six_unique():
    traits = {"bodyColor": 1, "hornColor": 2, "wingsColor": 3, "tailColor": 4,
              "accessoriesColor": 5, "eyesColor": 6}
    out = add_derived_traits(traits)
    assert out["n_distinct_colors"] == 6


def test_does_not_mutate_input():
    original = {"horn": 0}
    add_derived_traits(original)
    assert "has_horn" not in original


def test_preserves_existing_traits():
    traits = {"horn": 5, "bodyColor": 10}
    out = add_derived_traits(traits)
    assert out["horn"] == 5
    assert out["bodyColor"] == 10


def test_constants_stable():
    # Lock the trait lists — changing these alters scoring semantics.
    assert PRESENCE_TRAITS == ("horn", "wings", "legsBack", "hair", "accessories")
    assert COLOR_SLOTS == (
        "bodyColor", "hornColor", "wingsColor",
        "tailColor", "accessoriesColor", "eyesColor",
    )
