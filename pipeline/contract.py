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
TRAIT_FIELDS: tuple[str, ...] = (
    "backGroundColor",  # 0
    "body",             # 1
    "eyes",             # 2
    "horn",             # 3
    "wings",            # 4
    "tail",             # 5
    "legsFront",        # 6
    "legsBack",         # 7
    "accessories",      # 8
    "hair",             # 9
    "ground",           # 10
    "bodyColor",        # 11
    "hornColor",        # 12
    "wingsColor",       # 13
    "tailColor",        # 14
    "hairColor",        # 15
    "accessoriesColor", # 16
    "eyesColor",        # 17
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
