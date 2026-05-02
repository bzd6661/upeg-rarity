"""Tests for pipeline.holders — balance splitting."""
from pipeline.holders import compute_holder_entry, split_balance


# --- compute_holder_entry: authoritative-count-aware path used in production ---

def test_holder_entry_balance_matches_count():
    # 5.0 uPEG exactly, 5 NFTs — straightforward case
    raw = 5 * 10**18
    out = compute_holder_entry(raw, nft_count=5)
    assert out["nft_count"] == 5
    assert out["unbound"] == 0.0
    assert out["fractional"] == 0.0
    assert out["balance"] == "5.0000"


def test_holder_entry_with_sub1_fractional():
    # 5.732 uPEG, 5 NFTs (typical swap holder)
    raw = 5_732_000_000_000_000_000
    out = compute_holder_entry(raw, nft_count=5)
    assert out["nft_count"] == 5
    assert abs(out["unbound"] - 0.732) < 1e-3
    assert abs(out["fractional"] - 0.732) < 1e-3


def test_holder_entry_after_transfer_upeg():
    # 4.7245 balance but only 3 NFTs (transferUpeg sent 1 away).
    # Unbound = 4.7245 - 3 = 1.7245 (more than 1 — that's the signature of transferUpeg use)
    raw = 4_724_500_000_000_000_000
    out = compute_holder_entry(raw, nft_count=3)
    assert out["nft_count"] == 3
    assert abs(out["unbound"] - 1.7245) < 1e-3
    # fractional is the strict sub-1 piece of unbound
    assert abs(out["fractional"] - 0.7245) < 1e-3


def test_holder_entry_pure_fractional_holder():
    # 0.5 uPEG, no NFTs at all (pure dust holder)
    raw = 5 * 10**17
    out = compute_holder_entry(raw, nft_count=0)
    assert out["nft_count"] == 0
    assert abs(out["unbound"] - 0.5) < 1e-3
    assert abs(out["fractional"] - 0.5) < 1e-3


# --- legacy split_balance — kept for back-compat, behavior unchanged ---

def test_split_balance_legacy_uses_floor():
    # The legacy function still uses floor(balance) for nft_count.
    raw = 4_724_500_000_000_000_000
    out = split_balance(raw)
    assert out["nft_count"] == 4  # WRONG when transferUpeg used, but legacy path
    assert abs(out["fractional"] - 0.7245) < 1e-3
