from pathlib import Path

import pytest

from tests.gltest_windows_compat import install_windows_direct_compatibility


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = PROJECT_ROOT / "contracts" / "credence_market.py"
SDK_VERSION = "v0.2.16"
START_TIME = "2026-08-13T12:00:00+00:00"


install_windows_direct_compatibility()


@pytest.fixture
def credence(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.warp(START_TIME)
    return direct_deploy(
        str(CONTRACT_PATH),
        100,
        2_000,
        sdk_version=SDK_VERSION,
    )


def create_market(contract, lock_time=1_786_626_000, market_id="united-opener"):
    contract.create_market(
        market_id,
        "Will Manchester United win their opening league match?",
        "football",
        "YES only if Manchester United win in regulation time. Draws and losses resolve NO. Abandoned matches resolve VOID.",
        '["https://example.com/match-report"]',
        lock_time,
        100,
    )
    return market_id
