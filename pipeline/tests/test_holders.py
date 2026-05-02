"""Tests for pipeline.holders — balance splitting."""
from pipeline.holders import split_balance


def test_split_pure_integer_balance():
    # 5 uPEG exactly, 18 decimals
    raw = 5 * 10**18
    out = split_balance(raw)
    assert out["nft_count"] == 5
    assert out["fractional"] == 0.0
    assert out["balance"] == "5.0000"


def test_split_with_fraction():
    # 5.732 uPEG
    raw = 5_732_000_000_000_000_000  # 5.732 * 10^18
    out = split_balance(raw)
    assert out["nft_count"] == 5
    assert abs(out["fractional"] - 0.732) < 1e-6


def test_split_zero():
    out = split_balance(0)
    assert out["nft_count"] == 0
    assert out["fractional"] == 0.0


def test_split_pure_fractional():
    # 0.5 uPEG, no NFTs
    raw = 5 * 10**17
    out = split_balance(raw)
    assert out["nft_count"] == 0
    assert abs(out["fractional"] - 0.5) < 1e-6
