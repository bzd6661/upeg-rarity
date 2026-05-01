"""Serialize pipeline output to JSON files in `data/`."""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def emit_all(out_dir: Path, items: list[dict], block: int) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # Strip SVG from items for the main metadata file. SVGs are written
    # to a separate svgs.json keyed by id (Cloudflare Workers Static Assets
    # has a 25 MB per-file limit; combined ~26 MB exceeds it).
    items_no_svg = []
    svgs: dict[str, str] = {}
    for item in items:
        if "svg" in item:
            svgs[str(item["id"])] = item["svg"]
        items_no_svg.append({k: v for k, v in item.items() if k != "svg"})

    upegs_payload = {
        "generated_at": now,
        "block": block,
        "total_minted": len(items),
        "items": items_no_svg,
    }
    upegs_text = json.dumps(upegs_payload, separators=(",", ":"), sort_keys=True)
    (out_dir / "upegs.json").write_text(upegs_text)

    (out_dir / "svgs.json").write_text(
        json.dumps(svgs, separators=(",", ":"), sort_keys=True)
    )

    stats_payload = _build_stats(items_no_svg)
    (out_dir / "stats.json").write_text(json.dumps(stats_payload, indent=2))

    data_hash = hashlib.sha256(upegs_text.encode()).hexdigest()
    meta_payload = {
        "generated_at": now,
        "block": block,
        "total_minted": len(items),
        "data_hash": data_hash,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta_payload, indent=2))


def _build_stats(items: list[dict]) -> dict:
    counters: dict[str, Counter] = {}
    for item in items:
        for k, v in item["traits"].items():
            counters.setdefault(k, Counter())[v] += 1
    return {
        "total_minted": len(items),
        "trait_frequencies": {
            k: dict(c.most_common()) for k, c in counters.items()
        },
    }
