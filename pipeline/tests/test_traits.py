"""Tests for pipeline.traits — seed -> structured traits dict + SVG."""
import pytest
from pipeline.contract import TRAIT_FIELDS
from pipeline.traits import decode_seed_tuple, extract_traits, extract_svg


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeHook:
    def __init__(self, seed_to_meta: dict[int, tuple], seed_to_svg: dict[int, str]):
        self._meta = seed_to_meta
        self._svg = seed_to_svg

    @property
    def functions(self):
        return self

    def getSeedData(self, seed):
        return _FnReturn(self._meta[seed])

    def generate(self, seed):
        return _FnReturn(self._svg[seed])


class _FakeW3:
    def __init__(self, hook):
        self._hook = hook
        self.eth = self

    def contract(self, address, abi):
        return self._hook


def test_decode_seed_tuple_maps_positionally():
    # 18 values, one per TRAIT_FIELDS entry, all distinct so we can verify order
    meta = tuple(range(18))
    result = decode_seed_tuple(meta)
    assert result == {field: i for i, field in enumerate(TRAIT_FIELDS)}


def test_decode_seed_tuple_rejects_wrong_length():
    with pytest.raises(ValueError, match="expected 18"):
        decode_seed_tuple((1, 2, 3))


def test_extract_traits_calls_hook_and_decodes():
    seed = 12345
    meta = tuple(range(18))
    w3 = _FakeW3(_FakeHook({seed: meta}, {}))
    result = extract_traits(w3, seed)
    assert result["backGroundColor"] == 0
    # eyesColor is at position 12 per the corrected TRAIT_FIELDS (Etherscan ABI)
    assert result["eyesColor"] == 12
    # tailColor is at position 17 per the corrected TRAIT_FIELDS
    assert result["tailColor"] == 17
    assert len(result) == 18


def test_extract_svg_calls_generate():
    seed = 999
    w3 = _FakeW3(_FakeHook({}, {seed: "<svg width='24'></svg>"}))
    assert extract_svg(w3, seed) == "<svg width='24'></svg>"
