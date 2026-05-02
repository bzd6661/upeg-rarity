"""Per-holder balance breakdown.

Each holder's ERC-20 balance is split into:
- nft_count = floor(balance / 10^decimals)  — equals OwnerUpegsCount on chain
- fractional = balance / 10^decimals - nft_count  — the "scattered" sub-1 portion

Fractional values are stored as strings (e.g., "0.732") with 4 decimal precision
to avoid JSON float quirks. Raw balance also stored as a decimal string.
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


def split_balance(raw_balance: int, decimals: int = DEFAULT_DECIMALS) -> dict:
    """Split a raw integer balance into nft_count + fractional + display string."""
    scale = Decimal(10) ** decimals
    full = Decimal(raw_balance) / scale
    nft_count = int(full)
    fractional = full - Decimal(nft_count)
    return {
        "nft_count": nft_count,
        # Quantize fractional to 4 decimal places for display
        "fractional": float(fractional.quantize(Decimal("0.0001"))),
        # Full balance as a string for downstream display
        "balance": str(full.quantize(Decimal("0.0001"))),
    }
