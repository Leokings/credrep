import json

from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_failed, tx_execution_succeeded
from genlayer_py.types import CalldataAddress


PUBLIC_X_POST_WITHOUT_CHALLENGE = (
    "https://x.com/GenLayer/status/2041643224536592387"
)


def test_binding_challenge_and_live_x_consensus():
    factory = get_contract_factory(
        contract_file_path="credence_claims.py"
    )
    contract = factory.deploy(args=[100, 2_000], wait_retries=120)
    account = get_default_account()
    account_arg = CalldataAddress(account.address)

    begin_receipt = contract.begin_x_binding().transact(wait_retries=120)
    assert tx_execution_succeeded(begin_receipt)

    pending = contract.get_binding_challenge(args=[account_arg]).call()
    assert pending["active"] is True
    assert account.address.lower() in pending["challenge"]
    assert contract.get_identity_status(args=[account_arg]).call()[
        "status"
    ] == "PENDING"

    invalid_receipt = contract.verify_x_binding(
        args=[PUBLIC_X_POST_WITHOUT_CHALLENGE]
    ).transact(wait_retries=180)
    assert tx_execution_failed(invalid_receipt)
    assert "x_challenge_missing" in json.dumps(invalid_receipt)

    profile = contract.get_user_profile(args=[account_arg]).call()
    assert profile["registered"] is False
    assert profile["reputation"] == 0
