"""Tests for pipeline.rpc — RPC rotation and retry."""
from unittest.mock import MagicMock
import pytest
from pipeline.rpc import RpcRouter, AllRpcsFailed


def test_router_returns_first_success():
    a = MagicMock(return_value="A_OK")
    b = MagicMock(return_value="B_OK")
    router = RpcRouter([a, b], max_retries=1)
    assert router.call(lambda fn: fn()) == "A_OK"
    a.assert_called_once()
    b.assert_not_called()


def test_router_rotates_on_failure():
    a = MagicMock(side_effect=Exception("rate limited"))
    b = MagicMock(return_value="B_OK")
    router = RpcRouter([a, b], max_retries=1)
    assert router.call(lambda fn: fn()) == "B_OK"
    assert a.call_count == 1
    assert b.call_count == 1


def test_router_retries_within_endpoint():
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] < 2:
            raise Exception("transient")
        return "OK"

    router = RpcRouter([flaky], max_retries=3)
    assert router.call(lambda fn: fn()) == "OK"
    assert calls["n"] == 2


def test_router_raises_when_all_exhausted():
    a = MagicMock(side_effect=Exception("bad"))
    b = MagicMock(side_effect=Exception("worse"))
    router = RpcRouter([a, b], max_retries=2)
    with pytest.raises(AllRpcsFailed):
        router.call(lambda fn: fn())
    assert a.call_count == 2
    assert b.call_count == 2
