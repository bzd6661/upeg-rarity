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
    # Must include shape traits so gated color slots are visible.
    traits = {
        "horn": 1, "wings": 1, "accessories": 1, "hair": 1,
        "bodyColor": 1, "hornColor": 2, "wingsColor": 3, "tailColor": 4,
        "accessoriesColor": 5, "eyesColor": 6, "hairColor": 7,
    }
    out = add_derived_traits(traits)
    # All 7 color slots visible → {1,2,3,4,5,6,7} = 7 distinct
    assert out["n_distinct_colors"] == 7


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
        "bodyColor", "eyesColor", "tailColor",
        "hornColor", "wingsColor", "accessoriesColor", "hairColor",
    )


def test_n_distinct_colors_ignores_phantom_horn_color():
    # No horn → hornColor value should not count
    traits = {
        "horn": 0, "wings": 0, "tail": 1, "legsFront": 1, "legsBack": 0,
        "accessories": 0, "hair": 0, "body": 1, "eyes": 1, "ground": 0,
        "bodyColor": 5, "hornColor": 99,  # phantom — not visible
        "wingsColor": 99, "tailColor": 5, "hairColor": 99,
        "accessoriesColor": 99, "eyesColor": 5,
    }
    out = add_derived_traits(traits)
    # Visible: bodyColor=5, tailColor=5, eyesColor=5 → 1 distinct
    assert out["n_distinct_colors"] == 1


def test_n_distinct_colors_counts_visible_when_shape_present():
    traits = {
        "horn": 5, "wings": 3, "tail": 1, "legsFront": 1, "legsBack": 0,
        "accessories": 2, "hair": 0, "body": 1, "eyes": 1, "ground": 0,
        "bodyColor": 1, "hornColor": 2, "wingsColor": 3, "tailColor": 4,
        "hairColor": 99,  # phantom (hair=0)
        "accessoriesColor": 5, "eyesColor": 6,
    }
    out = add_derived_traits(traits)
    # Visible: body 1, eyes 6, tail 4, horn 2, wings 3, accessories 5 → 6 distinct
    # (hairColor 99 ignored because hair=0)
    assert out["n_distinct_colors"] == 6


def test_n_distinct_colors_token_58779_case():
    # Real-world case from mainnet that surfaced the bug.
    traits = {
        "horn": 0, "wings": 0, "tail": 15, "legsFront": 4, "legsBack": 1,
        "accessories": 0, "hair": 0, "body": 1, "eyes": 1, "ground": 0,
        "backGroundColor": 1,
        "bodyColor": 15, "hornColor": 12,  # phantom
        "wingsColor": 0,                    # phantom
        "tailColor": 0, "hairColor": 0,    # phantom (hair=0)
        "accessoriesColor": 0,              # phantom
        "eyesColor": 0,
    }
    out = add_derived_traits(traits)
    # Visible: bodyColor=15, tailColor=0, eyesColor=0 → {0, 15} → 2 distinct
    assert out["n_distinct_colors"] == 2
