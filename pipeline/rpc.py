"""RPC router: rotate across multiple endpoints with bounded retry.

Usage:
    router = RpcRouter.from_urls(["https://...", "https://..."])
    block = router.call(lambda w3: w3.eth.block_number)
"""
from __future__ import annotations

import logging
import os
import time
from typing import Callable, Sequence, TypeVar

from web3 import Web3

logger = logging.getLogger(__name__)

T = TypeVar("T")

DEFAULT_RPC_URLS = (
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
)


class AllRpcsFailed(RuntimeError):
    pass


class RpcRouter:
    def __init__(
        self,
        endpoints: Sequence[Callable[..., object]],
        max_retries: int = 3,
        backoff_seconds: float = 0.5,
    ):
        if not endpoints:
            raise ValueError("RpcRouter requires at least one endpoint")
        self._endpoints = list(endpoints)
        self._max_retries = max_retries
        self._backoff = backoff_seconds

    @classmethod
    def from_urls(cls, urls: Sequence[str], **kwargs) -> "RpcRouter":
        endpoints = [Web3(Web3.HTTPProvider(u)) for u in urls]
        return cls(endpoints, **kwargs)

    @classmethod
    def from_env(cls, **kwargs) -> "RpcRouter":
        raw = os.environ.get("RPC_URLS", ",".join(DEFAULT_RPC_URLS))
        urls = [u.strip() for u in raw.split(",") if u.strip()]
        return cls.from_urls(urls, **kwargs)

    def call(self, fn: Callable[[object], T]) -> T:
        """Run fn(endpoint) trying each endpoint up to max_retries times."""
        last_err: Exception | None = None
        for endpoint in self._endpoints:
            for attempt in range(self._max_retries):
                try:
                    return fn(endpoint)
                except Exception as e:
                    last_err = e
                    logger.warning(
                        "RPC call failed on endpoint %s (attempt %d/%d): %s",
                        getattr(endpoint, "provider", endpoint),
                        attempt + 1,
                        self._max_retries,
                        e,
                    )
                    time.sleep(self._backoff * (2**attempt))
        raise AllRpcsFailed(
            f"All {len(self._endpoints)} endpoints exhausted after "
            f"{self._max_retries} retries each. Last error: {last_err}"
        )
