"""Probe the uPEG contract to determine which trait-extraction scenario applies.

Exits with one of:
  Scenario A: tokenURI returns base64 JSON with structured `attributes`.
  Scenario B: tokenURI returns raw SVG (or data URI w/o JSON); traits live in pixels.
  Scenario C: no tokenURI / no externally readable trait surface.

RESULT: This contract is a HYBRID — no tokenURI, but has getSeedData() on the
imageParams helper contract (0xe54082DfBf044B6a8F584bdDdb90a22d5613C440) which
returns a fully structured UpegMetadata with 18 trait fields. Classification: Scenario A
(structured on-chain traits, one function call per token).
"""
from __future__ import annotations
import base64
import json
import sys
from web3 import Web3

CONTRACT = Web3.to_checksum_address("0x44b28991b167582f18ba0259e0173176ca125505")
IMAGE_PARAMS_CONTRACT = Web3.to_checksum_address("0xe54082DfBf044B6a8F584bdDdb90a22d5613C440")
RPC = "https://1rpc.io/eth"

# Minimal ABI: just enough to call tokenURI and detect ERC-721 surface
ABI = [
    {
        "name": "tokenURI",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "supportsInterface",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "interfaceId", "type": "bytes4"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "name",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "symbol",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "UpegsTotalCount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint256"}],
    },
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
        "name": "OwnerUpeg",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "index", "type": "uint256"},
        ],
        "outputs": [
            {
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "seed", "type": "uint256"},
                ],
                "name": "",
                "type": "tuple",
            }
        ],
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
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "seed", "type": "uint256"},
                ],
                "name": "",
                "type": "tuple[]",
            }
        ],
    },
    {
        "name": "imageParams",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "randomSeedProvider",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "OwnerOwns",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "upegId", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
]

UPEG_METADATA_COMPONENTS = [
    {"name": "backGroundColor", "type": "uint8"},
    {"name": "body", "type": "uint8"},
    {"name": "eyes", "type": "uint8"},
    {"name": "hair", "type": "uint8"},
    {"name": "horn", "type": "uint8"},
    {"name": "legsBack", "type": "uint8"},
    {"name": "legsFront", "type": "uint8"},
    {"name": "wings", "type": "uint8"},
    {"name": "tail", "type": "uint8"},
    {"name": "accessories", "type": "uint8"},
    {"name": "ground", "type": "uint8"},
    {"name": "bodyColor", "type": "uint8"},
    {"name": "eyesColor", "type": "uint8"},
    {"name": "hairColor", "type": "uint8"},
    {"name": "hornColor", "type": "uint8"},
    {"name": "groundColor", "type": "uint8"},
    {"name": "accessoriesColor", "type": "uint8"},
    {"name": "tailColor", "type": "uint8"},
]

IMAGE_ABI = [
    {
        "name": "getSeedData",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"components": UPEG_METADATA_COMPONENTS, "name": "", "type": "tuple"}],
    },
    {
        "name": "generate",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "seed", "type": "uint256"}],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "getImageParams",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {
                "components": [
                    {"name": "colorsCount", "type": "uint8"},
                    {"name": "backgroundColorsCount", "type": "uint8"},
                    {"name": "accessoriesCount", "type": "uint256"},
                    {"name": "bodyCount", "type": "uint256"},
                    {"name": "eyesCount", "type": "uint256"},
                    {"name": "hairCount", "type": "uint256"},
                    {"name": "hornCount", "type": "uint256"},
                    {"name": "legsFrontCount", "type": "uint256"},
                    {"name": "legsBackCount", "type": "uint256"},
                    {"name": "tailCount", "type": "uint256"},
                    {"name": "groundCount", "type": "uint256"},
                    {"name": "wingsCount", "type": "uint256"},
                ],
                "name": "",
                "type": "tuple",
            }
        ],
    },
]


def main() -> int:
    w3 = Web3(Web3.HTTPProvider(RPC))
    if not w3.is_connected():
        print("RPC unreachable", file=sys.stderr)
        return 2

    contract = w3.eth.contract(address=CONTRACT, abi=ABI)
    image_contract = w3.eth.contract(address=IMAGE_PARAMS_CONTRACT, abi=IMAGE_ABI)

    # Try basic identity
    try:
        print(f"name = {contract.functions.name().call()}")
        print(f"symbol = {contract.functions.symbol().call()}")
    except Exception as e:
        print(f"name/symbol failed: {e}")

    # Show collection stats
    try:
        print(f"UpegsTotalCount = {contract.functions.UpegsTotalCount().call()}")
        print(f"HoldersCount = {contract.functions.HoldersCount().call()}")
        print(f"imageParams contract = {contract.functions.imageParams().call()}")
        print(f"randomSeedProvider = {contract.functions.randomSeedProvider().call()}")
    except Exception as e:
        print(f"Collection stats failed: {e}")

    # Try tokenURI for several IDs (1, 2, 100) — expected to revert (not implemented)
    for token_id in (1, 2, 100):
        print(f"\n--- tokenURI({token_id}) ---")
        try:
            uri = contract.functions.tokenURI(token_id).call()
        except Exception as e:
            print(f"REVERTED: {e}")
            continue

        print(f"length = {len(uri)}")
        print(f"first 200 chars: {uri[:200]}")

        if uri.startswith("data:application/json;base64,"):
            payload = base64.b64decode(uri.split(",", 1)[1])
            try:
                meta = json.loads(payload)
                print(f"DECODED JSON KEYS: {list(meta.keys())}")
                if "attributes" in meta:
                    print(f"ATTRIBUTES SAMPLE: {json.dumps(meta['attributes'][:5], indent=2)}")
                    print(">>> SCENARIO A (structured JSON with attributes)")
                else:
                    print(">>> SCENARIO B (JSON without attributes — likely embeds SVG only)")
            except Exception as e:
                print(f"base64 decode failed: {e}")
        elif uri.startswith("data:image/svg") or "<svg" in uri[:300]:
            print(">>> SCENARIO B (raw SVG, no JSON wrapper)")
        else:
            print(">>> UNKNOWN URI FORMAT — investigate manually")

    # Demonstrate the actual trait extraction path via imageParams contract
    print("\n=== ACTUAL TRAIT EXTRACTION PATH (via imageParams contract) ===")
    print("Step 1: Get UpegSeedData from main contract via OwnerUpegsPage(owner, page, pageSize)")
    print("Step 2: Call imageParams.getSeedData(seed) -> UpegMetadata struct")
    print()

    # Get a real holder and sample their upegs
    try:
        holder = contract.functions.Holder(0).call()
        upeg_data = contract.functions.OwnerUpeg(holder, 0).call()
        token_id, seed = upeg_data
        print(f"Sample holder: {holder}")
        print(f"Upeg id={token_id}, seed={seed}")

        meta = image_contract.functions.getSeedData(seed).call()
        fields = [c["name"] for c in UPEG_METADATA_COMPONENTS]
        print(f"\nUpegMetadata for upeg #{token_id}:")
        for i, field in enumerate(fields):
            print(f"  {field} = {meta[i]}")

        svg = image_contract.functions.generate(seed).call()
        print(f"\ngenerate(seed) SVG length = {len(svg)} chars")
        print(f"first 200 chars: {svg[:200]}")
        print(">>> SCENARIO A (structured traits via getSeedData, SVG via generate)")
    except Exception as e:
        print(f"Trait extraction demo failed: {e}")

    # Show trait count space
    print("\n=== TRAIT SPACE (from getImageParams) ===")
    try:
        ip = image_contract.functions.getImageParams().call()
        print(f"colorsCount = {ip[0]}")
        print(f"backgroundColorsCount = {ip[1]}")
        print(f"accessoriesCount = {ip[2]}")
        print(f"bodyCount = {ip[3]}")
        print(f"eyesCount = {ip[4]}")
        print(f"hairCount = {ip[5]}")
        print(f"hornCount = {ip[6]}")
        print(f"legsFrontCount = {ip[7]}")
        print(f"legsBackCount = {ip[8]}")
        print(f"tailCount = {ip[9]}")
        print(f"groundCount = {ip[10]}")
        print(f"wingsCount = {ip[11]}")
    except Exception as e:
        print(f"getImageParams failed: {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
