"""Per-holder balance breakdown.

A holder's ERC-20 balance does NOT always equal NFT count × 1.0 + fractional,
because the uPEG contract supports `transferUpeg(id)` — you can transfer a
specific NFT without changing your token balance. So someone with balance
4.7245 uPEG could hold anywhere from 0 to 4 NFTs depending on transferUpeg
history.

The authoritative NFT count comes from `OwnerUpegsCount` (or equivalently,
the count of (id, seed) pairs we get from enumeration). The fractional /
"unbound" balance is the difference:
    unbound = balance - nft_count

For pure swap-only users, unbound is < 1 (just the sub-1 fractional piece).
For users who used transferUpeg to send specific NFTs away, unbound can be
≥ 1 (one or more "ghost" tokens worth of balance with no NFT bound).
"""
from __future__ import annotations

from decimal import Decimal, getcontext

from pipeline.contract import MAIN_ABI, UPEG_ADDRESS

# Plenty of precision for 18-decimal arithmetic
getcontext().prec = 50

DEFAULT_DECIMALS = 18


def _main_contract(w3):
    return w3.eth.contract(address=UPEG_ADDRESS, abi=MAIN_ABI)


def get_decimals(w3) -> int:
    try:
        return int(_main_contract(w3).functions.decimals().call())
    except Exception:
        return DEFAULT_DECIMALS


def balance_of(w3, holder: str) -> int:
    """Return raw uint256 balance (in smallest unit)."""
    return int(_main_contract(w3).functions.balanceOf(holder).call())


def compute_holder_entry(
    raw_balance: int,
    nft_count: int,
    decimals: int = DEFAULT_DECIMALS,
) -> dict:
    """Build a holder entry from raw balance + authoritative NFT count.

    `nft_count` should come from OwnerUpegsCount or our enumeration, NOT from
    floor(balance) — those two diverge when transferUpeg has been used.

    `unbound` is the balance not bound to an NFT. For swap-only holders this
    is < 1 ("scattered"). For holders who transferred specific NFTs out, it
    can be ≥ 1 ("ghost balance" representing tokens without bound NFTs).
    """
    scale = Decimal(10) ** decimals
    full = Decimal(raw_balance) / scale
    unbound = full - Decimal(nft_count)
    return {
        "nft_count": nft_count,
        # Total unbound = sub-NFT balance. Often < 1 but can be higher after transferUpeg.
        "unbound": float(unbound.quantize(Decimal("0.0001"))),
        # Strict sub-1 "fractional" portion — kept for backwards compatibility.
        # If unbound >= 1, this is the part above the integer floor of unbound.
        "fractional": float((unbound - Decimal(int(unbound))).quantize(Decimal("0.0001"))),
        "balance": str(full.quantize(Decimal("0.0001"))),
    }


def split_balance(raw_balance: int, decimals: int = DEFAULT_DECIMALS) -> dict:
    """DEPRECATED — uses floor(balance) which is wrong when transferUpeg was used.

    Kept for tests / backwards compat. New code should call compute_holder_entry()
    with the authoritative nft_count from enumeration.
    """
    scale = Decimal(10) ** decimals
    full = Decimal(raw_balance) / scale
    nft_count = int(full)
    fractional = full - Decimal(nft_count)
    return {
        "nft_count": nft_count,
        "fractional": float(fractional.quantize(Decimal("0.0001"))),
        "balance": str(full.quantize(Decimal("0.0001"))),
    }
