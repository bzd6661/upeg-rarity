"""Holder + holdings enumeration via the main uPEG contract.

uPEG does NOT expose tokenURI. Token enumeration walks current holders
(via HoldersCount + Holder(i)) and pages through each holder's holdings
(via OwnerUpegsPage). Each holding is a (token_id, seed) tuple — the seed
is what feeds trait extraction in `pipeline.traits`.
"""
from __future__ import annotations

import logging

from pipeline.contract import MAIN_ABI, UPEG_ADDRESS

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 100


def _main_contract(w3):
    return w3.eth.contract(address=UPEG_ADDRESS, abi=MAIN_ABI)


def enumerate_holders(w3) -> list[str]:
    """Return every current uPEG holder address."""
    c = _main_contract(w3)
    n = c.functions.HoldersCount().call()
    return [c.functions.Holder(i).call() for i in range(n)]


def enumerate_holdings(
    w3, holder: str, page_size: int = DEFAULT_PAGE_SIZE
) -> list[tuple[int, int]]:
    """Return [(token_id, seed), ...] currently held by `holder`."""
    c = _main_contract(w3)
    count = c.functions.OwnerUpegsCount(holder).call()
    if count == 0:
        return []
    pages = (count + page_size - 1) // page_size
    out: list[tuple[int, int]] = []
    for page in range(pages):
        # OwnerUpegsPage is 0-indexed (verified in Phase 0)
        items = c.functions.OwnerUpegsPage(holder, page, page_size).call()
        for entry in items:
            # web3.py returns each tuple element as positional (id, seed)
            out.append((int(entry[0]), int(entry[1])))
    return out


def enumerate_all(w3) -> list[tuple[int, int, str]]:
    """Enumerate the full collection as [(token_id, seed, owner), ...]."""
    out: list[tuple[int, int, str]] = []
    holders = enumerate_holders(w3)
    logger.info("Enumerating holdings across %d holders", len(holders))
    for holder in holders:
        for token_id, seed in enumerate_holdings(w3, holder):
            out.append((token_id, seed, holder))
    return out
