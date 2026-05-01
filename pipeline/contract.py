"""uPEG contract addresses + ABI fragments + trait schema used by the pipeline.

The collection lives across two contracts:
- UPEG_ADDRESS: main hybrid ERC-20/NFT contract. Holds enumeration surface.
- HOOK_ADDRESS: imageParams helper. Holds trait extraction (getSeedData) and SVG (generate).

`tokenURI` is intentionally NOT in any ABI — it reverts unconditionally on chain.
"""
from web3 import Web3

UPEG_ADDRESS = Web3.to_checksum_address("0x44b28991b167582f18ba0259e0173176ca125505")
HOOK_ADDRESS = Web3.to_checksum_address("0xe54082DfBf044B6a8F584bdDdb90a22d5613C440")

# Field order MUST match the Solidity UpegMetadata struct exactly.
# web3.py decodes structs as positional tuples; meta[i] corresponds to TRAIT_FIELDS[i].
#
# Authoritative source: hook contract ABI on Etherscan
#   https://etherscan.io/address/0xe54082DfBf044B6a8F584bdDdb90a22d5613C440#code
# Cross-validated against token #33855 ground truth from https://unipeg.art:
#   official HAIR=8   → pos 3 raw=8  ✓
#   official HORN=0   → pos 4 raw=0  ✓
#   official BACK LEGS=9 → pos 5 raw=9 ✓
#   official FRONT LEGS=3 → pos 6 raw=3 ✓
#   official WINGS=0  → pos 7 raw=0  ✓
#   official TAIL=0   → pos 8 raw=0  ✓
#   official ACCESSORIES=10 → pos 9 raw=10 ✓
#   official GROUND=0 → pos 10 raw=0 ✓
#
# Color slots (11-17) sourced from the Etherscan ABI tuple components in order.
# NOTE: the struct has groundColor (pos 15) and NO wingsColor — the original
# Phase-0 labeling had these wrong (wingsColor at 13, hairColor at 15, no groundColor).
TRAIT_FIELDS: tuple[str, ...] = (
    "backGroundColor",  # 0
    "body",             # 1
    "eyes",             # 2
    "hair",             # 3  (was "horn" — CORRECTED)
    "horn",             # 4  (was "wings" — CORRECTED)
    "legsBack",         # 5  (was "tail" — CORRECTED)
    "legsFront",        # 6
    "wings",            # 7  (was "legsBack" — CORRECTED)
    "tail",             # 8  (was "accessories" — CORRECTED)
    "accessories",      # 9  (was "hair" — CORRECTED)
    "ground",           # 10
    "bodyColor",        # 11
    "eyesColor",        # 12 (was "hornColor" — CORRECTED)
    "hairColor",        # 13 (was "wingsColor" — CORRECTED)
    "hornColor",        # 14 (was "tailColor" — CORRECTED)
    "groundColor",      # 15 (was "hairColor" — CORRECTED; field renamed too)
    "accessoriesColor", # 16
    "tailColor",        # 17 (was "eyesColor" — CORRECTED)
)

MAIN_ABI = [
    {
        "name": "HoldersCount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "Holder",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "index", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "OwnerUpegsCount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "owner", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "OwnerUpegsPage",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "page", "type": "uint256"},
            {"name": "pageSize", "type": "uint256"},
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "seed", "type": "uint256"},
                ],
            }
        ],
    },
]

# UpegMetadata struct (18 uint8 fields) — must match TRAIT_FIELDS order
_METADATA_COMPONENTS = [{"name": n, "type": "uint8"} for n in TRAIT_FIELDS]

HOOK_ABI = [
    {
        "name": "getSeedData",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"name": "", "type": "tuple", "components": _METADATA_COMPONENTS}],
    },
    {
        "name": "generate",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
    },
]
