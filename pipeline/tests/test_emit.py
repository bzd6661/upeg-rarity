"""Tests for pipeline.emit — JSON file serialization."""
import json
from pathlib import Path
from pipeline.emit import emit_all


def test_emit_all_writes_four_files(tmp_path: Path):
    items = [
        {"id": 1, "owner": "0xabc", "traits": {"color": "red"}, "score": 1.5, "rank": 1, "svg": "<svg/>"},
    ]
    emit_all(out_dir=tmp_path, items=items, block=999)

    upegs = json.loads((tmp_path / "upegs.json").read_text())
    assert upegs["block"] == 999
    assert upegs["total_minted"] == 1
    assert upegs["items"][0]["id"] == 1
    # SVG must NOT be in the main file
    assert "svg" not in upegs["items"][0]

    svgs = json.loads((tmp_path / "svgs.json").read_text())
    assert svgs["1"] == "<svg/>"

    stats = json.loads((tmp_path / "stats.json").read_text())
    assert stats["total_minted"] == 1
    assert stats["trait_frequencies"]["color"]["red"] == 1

    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["block"] == 999
    assert "data_hash" in meta
    assert len(meta["data_hash"]) == 64


def test_meta_hash_changes_when_traits_change(tmp_path: Path):
    items_a = [{"id": 1, "owner": "0xa", "traits": {"c": "r"}, "score": 1.0, "rank": 1, "svg": ""}]
    items_b = [{"id": 1, "owner": "0xa", "traits": {"c": "b"}, "score": 1.0, "rank": 1, "svg": ""}]
    emit_all(tmp_path, items_a, block=1)
    h1 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    emit_all(tmp_path, items_b, block=1)
    h2 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    assert h1 != h2


def test_meta_hash_unchanged_when_only_svg_changes(tmp_path: Path):
    # SVG is not part of the main upegs.json hash, so changing only the
    # SVG should NOT trigger a frontend cache invalidation.
    items_a = [{"id": 1, "owner": "0xa", "traits": {"c": "r"}, "score": 1.0, "rank": 1, "svg": "<svg version='1'/>"}]
    items_b = [{"id": 1, "owner": "0xa", "traits": {"c": "r"}, "score": 1.0, "rank": 1, "svg": "<svg version='2'/>"}]
    emit_all(tmp_path, items_a, block=1)
    h1 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    emit_all(tmp_path, items_b, block=1)
    h2 = json.loads((tmp_path / "meta.json").read_text())["data_hash"]
    assert h1 == h2
