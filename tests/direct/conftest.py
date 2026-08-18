from pathlib import Path

import pytest

from tests.gltest_windows_compat import install_direct_compatibility


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = PROJECT_ROOT / "contracts" / "credence_claims.deploy.py"
SDK_VERSION = "v0.2.16"
START_TIME = "2026-08-13T12:00:00+00:00"
RESOLUTION_TIME = 1_786_665_600


install_direct_compatibility()


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
