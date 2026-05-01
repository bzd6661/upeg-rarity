"""Tests for pipeline.derived — derived trait computation."""
from pipeline.derived import add_derived_traits, count_svg_colors, PRESENCE_TRAITS


def test_count_svg_colors_unique():
    svg = '<svg><rect fill="#ff0000"/><rect fill="#00ff00"/><rect fill="#ff0000"/></svg>'
    assert count_svg_colors(svg) == 2


def test_count_svg_colors_case_insensitive():
    svg = '<svg><rect fill="#ABC"/><rect fill="#abc"/></svg>'
    assert count_svg_colors(svg) == 1


def test_count_svg_colors_handles_single_quotes():
    svg = "<svg><rect fill='#aabbcc'/></svg>"
    assert count_svg_colors(svg) == 1


def test_count_svg_colors_empty():
    assert count_svg_colors("") == 0
    assert count_svg_colors("<svg></svg>") == 0


def test_has_present_when_value_nonzero():
    traits = {
        "horn": 5, "wings": 0, "tail": 3,
        "accessories": 2, "hair": 0,
    }
    out = add_derived_traits(traits, svg="<svg><rect fill='#aaa'/></svg>")
    assert out["has_horn"] == 1
    assert out["has_wings"] == 0
    assert out["has_tail"] == 1
    assert out["has_hair"] == 0
    assert out["has_accessories"] == 1


def test_n_distinct_colors_from_svg():
    traits = {"horn": 0}
    svg = '<svg><rect fill="#aaa"/><rect fill="#bbb"/><rect fill="#aaa"/></svg>'
    out = add_derived_traits(traits, svg=svg)
    assert out["n_distinct_colors"] == 2


def test_n_distinct_colors_omitted_when_no_svg():
    out = add_derived_traits({"horn": 1})
    assert "n_distinct_colors" not in out


def test_does_not_mutate_input():
    original = {"horn": 0}
    add_derived_traits(original, svg="<svg><rect fill='#aaa'/></svg>")
    assert "has_horn" not in original
    assert len(original) == 1


def test_preserves_existing_traits():
    traits = {"horn": 5, "bodyColor": 10}
    out = add_derived_traits(traits, svg="<svg><rect fill='#aaa'/></svg>")
    assert out["horn"] == 5
    assert out["bodyColor"] == 10


def test_constants_stable():
    assert PRESENCE_TRAITS == ("horn", "wings", "tail", "hair", "accessories")
