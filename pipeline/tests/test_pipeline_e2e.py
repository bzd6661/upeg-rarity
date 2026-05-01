"""End-to-end pipeline test with fully mocked RPC + contracts."""
import json
from pathlib import Path
from unittest.mock import patch

from pipeline.__main__ import main
from pipeline.contract import HOOK_ADDRESS, UPEG_ADDRESS


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeMain:
    """Main UPEG contract mock — implements enumeration."""
    def __init__(self, holdings: dict[str, list[tuple[int, int]]]):
        self._holdings = holdings
        self._holders = list(holdings.keys())

    @property
    def functions(self):
        return self

    def HoldersCount(self):
        return _FnReturn(len(self._holders))

    def Holder(self, i):
        return _FnReturn(self._holders[i])

    def OwnerUpegsCount(self, owner):
        return _FnReturn(len(self._holdings[owner]))

    def OwnerUpegsPage(self, owner, page, page_size):
        items = self._holdings[owner]
        start = page * page_size
        return _FnReturn(items[start:start + page_size])


class _FakeHook:
    """Hook contract mock — implements getSeedData + generate."""
    def __init__(self, seed_data: dict[int, tuple], svgs: dict[int, str]):
        self._seed_data = seed_data
        self._svgs = svgs

    @property
    def functions(self):
        return self

    def getSeedData(self, seed):
        return _FnReturn(self._seed_data[seed])

    def generate(self, seed):
        return _FnReturn(self._svgs[seed])


class _FakeEth:
    def __init__(self, main, hook, latest_block):
        self._main = main
        self._hook = hook
        self.block_number = latest_block

    def contract(self, address, abi):
        if address == UPEG_ADDRESS:
            return self._main
        if address == HOOK_ADDRESS:
            return self._hook
        raise AssertionError(f"unexpected contract address {address}")


class _FakeW3:
    def __init__(self, main, hook, latest_block):
        self.eth = _FakeEth(main, hook, latest_block)


def test_pipeline_end_to_end(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    main_contract = _FakeMain({
        "0xaaaa": [(1, 100), (2, 200)],
        "0xbbbb": [(3, 300)],
    })
    # 18-tuple traits — first byte is "category" so we can verify rarity
    hook_contract = _FakeHook(
        seed_data={
            100: (0,) + tuple(range(1, 18)),
            200: (1,) + tuple(range(1, 18)),
            300: (1,) + tuple(range(1, 18)),
        },
        svgs={100: "<svg id='100'/>", 200: "<svg id='200'/>", 300: "<svg id='300'/>"},
    )
    fake_w3 = _FakeW3(main_contract, hook_contract, latest_block=500)

    with patch("pipeline.rpc.RpcRouter.from_env") as mock_router:
        mock_router.return_value.call.side_effect = lambda fn: fn(fake_w3)
        rc = main([])

    assert rc == 0
    upegs = json.loads((tmp_path / "data" / "upegs.json").read_text())
    assert upegs["total_minted"] == 3
    ids = sorted(item["id"] for item in upegs["items"])
    assert ids == [1, 2, 3]
    by_id = {item["id"]: item for item in upegs["items"]}
    # Token 1 has unique backGroundColor=0 (others=1) → rarest → rank 1
    assert by_id[1]["rank"] == 1
    # Owner mapping reflects the fake holdings
    assert by_id[1]["owner"] == "0xaaaa"
    assert by_id[3]["owner"] == "0xbbbb"
    # "ground" has no variants (groundCount=0) and must be excluded from traits
    for item in upegs["items"]:
        assert "ground" not in item["traits"], (
            f"item {item['id']} should not have 'ground' in traits"
        )
    # Derived traits must be present on every item
    derived_presence = ("has_horn", "has_wings", "has_tail", "has_hair", "has_accessories")
    for item in upegs["items"]:
        assert any(k in item["traits"] for k in derived_presence), (
            f"item {item['id']} missing all has_* derived traits"
        )
        assert "n_distinct_colors" in item["traits"], (
            f"item {item['id']} missing n_distinct_colors"
        )
