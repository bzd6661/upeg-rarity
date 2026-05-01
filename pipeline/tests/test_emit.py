"""Tests for pipeline.emit — JSON file serialization."""
import json
from pathlib import Path
from pipeline.emit import emit_all


def test_emit_all_writes_three_files(tmp_path: Path):
    items = [
        {"id": 1, "owner": "0xabc", "traits": {"color": "red"}, "score": 1.5, "rank": 1, "svg": "<svg/>"},
    ]
    emit_all(out_dir=tmp_path, items=items, block=999)

    upegs = json.loads((tmp_path / "upegs.json").read_text())
    assert upegs["block"] == 999
    assert upegs["total_minted"] == 1
    assert upegs["items"][0]["id"] == 1

    stats = json.loads((tmp_path / "stats.json").read_text())
    assert stats["total_minted"] == 1
    assert stats["trait_frequencies"]["color"]["red"] == 1

    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["block"] == 999
    assert "data_hash" in meta
    assert len(meta["data_hash"]) == 64  # sha256 hex


def test_meta_hash_changes_when_items_change(tmp_path: Path):
    items_a = [{"id": 1, "owner": "0xa", "traits": {"c": "r"}, "score": 1.0, "rank": 1, "svg": ""}]
    items_b = [{"id": 1, "owner": "0xa", "traits": {"c": "b"}, "score": 1.0, "rank": 1, "svg": ""}]
    emit_all(tmp_path, items_a, block=1)
    h1 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    emit_all(tmp_path, items_b, block=1)
    h2 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    assert h1 != h2
