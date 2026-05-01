"""Tests for pipeline.enumerate — holder-and-holdings enumeration."""
from pipeline.enumerate import enumerate_all, enumerate_holders, enumerate_holdings


class _FnReturn:
    def __init__(self, value):
        self._value = value
    def call(self):
        return self._value


class _FakeMain:
    """Stand-in for the main UPEG contract — implements HoldersCount/Holder/OwnerUpegs*."""
    def __init__(self, holdings_by_holder: dict[str, list[tuple[int, int]]]):
        self._holdings = holdings_by_holder
        self._holders = list(holdings_by_holder.keys())

    @property
    def functions(self):
        return self

    def HoldersCount(self):
        return _FnReturn(len(self._holders))

    def Holder(self, index):
        return _FnReturn(self._holders[index])

    def OwnerUpegsCount(self, owner):
        return _FnReturn(len(self._holdings.get(owner, [])))

    def OwnerUpegsPage(self, owner, page, pageSize):
        items = self._holdings.get(owner, [])
        start = page * pageSize
        return _FnReturn(items[start : start + pageSize])


class _FakeW3:
    def __init__(self, main_contract):
        self._main = main_contract
        self.eth = self

    def contract(self, address, abi):
        return self._main


def test_enumerate_holders_returns_all():
    main = _FakeMain({"0xaaa": [], "0xbbb": [], "0xccc": []})
    w3 = _FakeW3(main)
    assert enumerate_holders(w3) == ["0xaaa", "0xbbb", "0xccc"]


def test_enumerate_holdings_pages_through_one_owner():
    main = _FakeMain({
        "0xaaa": [(1, 100), (2, 200), (3, 300), (4, 400), (5, 500)],
    })
    w3 = _FakeW3(main)
    holdings = enumerate_holdings(w3, "0xaaa", page_size=2)
    assert holdings == [(1, 100), (2, 200), (3, 300), (4, 400), (5, 500)]


def test_enumerate_holdings_handles_empty_owner():
    main = _FakeMain({"0xaaa": []})
    w3 = _FakeW3(main)
    assert enumerate_holdings(w3, "0xaaa") == []


def test_enumerate_all_combines_holders_and_holdings():
    main = _FakeMain({
        "0xaaa": [(1, 100), (2, 200)],
        "0xbbb": [(3, 300)],
    })
    w3 = _FakeW3(main)
    result = enumerate_all(w3)
    assert sorted(result) == [(1, 100, "0xaaa"), (2, 200, "0xaaa"), (3, 300, "0xbbb")]
