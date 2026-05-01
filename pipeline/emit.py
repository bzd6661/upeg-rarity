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
    upegs_payload = {
        "generated_at": now,
        "block": block,
        "total_minted": len(items),
        "items": items,
    }
    upegs_text = json.dumps(upegs_payload, separators=(",", ":"), sort_keys=True)
    (out_dir / "upegs.json").write_text(upegs_text)

    stats_payload = _build_stats(items)
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
