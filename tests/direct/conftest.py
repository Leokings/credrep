from pathlib import Path

import pytest

from tests.gltest_windows_compat import install_windows_direct_compatibility


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = PROJECT_ROOT / "contracts" / "credence_claims.py"
SDK_VERSION = "v0.2.16"
START_TIME = "2026-08-13T12:00:00+00:00"
RESOLUTION_TIME = 1_786_665_600


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


def make_claim(contract, claim_id="fed-september-cut", stake=1):
    contract.make_claim(
        claim_id,
        "The Federal Reserve will cut its target range at its September meeting.",
        "economy",
        "TRUE requires either bound of the announced target range to be lower than immediately before the meeting.",
        '["https://example.com/fed-statement"]',
        RESOLUTION_TIME,
        stake,
    )
    return claim_id
