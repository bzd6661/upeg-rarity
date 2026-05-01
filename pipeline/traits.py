"""Trait + SVG extraction via the helper hook contract.

uPEG traits live in a 2-contract setup. The main contract gives us (id, seed)
pairs. This module turns seed -> structured trait dict via getSeedData, and
seed -> on-chain SVG via generate. Both calls hit HOOK_ADDRESS.

web3.py decodes the UpegMetadata struct as a positional tuple — element i
maps to TRAIT_FIELDS[i]. See docs/phase0-findings.md for the full schema.
"""
from __future__ import annotations

from pipeline.contract import HOOK_ABI, HOOK_ADDRESS, TRAIT_FIELDS


def _hook_contract(w3):
    return w3.eth.contract(address=HOOK_ADDRESS, abi=HOOK_ABI)


def decode_seed_tuple(meta: tuple) -> dict[str, int]:
    """Map a positional 18-tuple from getSeedData() into a {field_name: value} dict."""
    if len(meta) != len(TRAIT_FIELDS):
        raise ValueError(
            f"expected {len(TRAIT_FIELDS)} fields, got {len(meta)}: {meta}"
        )
    return {field: int(value) for field, value in zip(TRAIT_FIELDS, meta)}


def extract_traits(w3, seed: int) -> dict[str, int]:
    """Read traits for a single seed via getSeedData(seed) on the hook contract."""
    meta = _hook_contract(w3).functions.getSeedData(seed).call()
    return decode_seed_tuple(meta)


def extract_svg(w3, seed: int) -> str:
    """Read the on-chain SVG for a single seed via generate(seed) on the hook contract."""
    return _hook_contract(w3).functions.generate(seed).call()
