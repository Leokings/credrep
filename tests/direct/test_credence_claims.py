import json
from datetime import datetime

from tests.direct.conftest import make_claim


def unix(value: str) -> int:
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


def x_post_html(
    tweet_id: str,
    challenge: str,
    identity_id: str,
    handle: str,
    *,
    reply: bool = False,
) -> str:
    reply_value = '{__ref:"another-tweet"}' if reply else "null"
    return (
        '<html><body>__typename:"Tweet",rest_id:"'
        + tweet_id
        + '",article:null,reply_to_results:'
        + reply_value
        + ",reply_to_user_results:"
        + reply_value
        + ',exclusive_tweet_info:null,id:"tweet:'
        + tweet_id
        + '"},__typename:"User",rest_id:"'
        + identity_id
        + '",id:"user:'
        + identity_id
        + '"},__typename:"UserCore",name:"Credence user",screen_name:"'
        + handle
        + '"},__typename:"TBirdData",full_text:"'
        + challenge
        + '",hashtag_entities:[],cashtag_entities:[]</body></html>'
    )


def begin_binding(contract, vm, account):
    vm.sender = account
    contract.begin_x_binding()
    return contract.get_binding_challenge(account)["challenge"]


def complete_binding(
    contract,
    vm,
    account,
    *,
    identity_id="1234567890123456789",
    handle="credence_user",
    tweet_id="2042000000000000001",
    reply=False,
):
    challenge = contract.get_binding_challenge(account)["challenge"]
    proof_url = f"https://x.com/{handle}/status/{tweet_id}"
    vm.mock_web(
        rf".*status/{tweet_id}.*",
        {
            "status": 200,
            "body": x_post_html(
                tweet_id,
                challenge,
                identity_id,
                handle,
                reply=reply,
            ),
        },
    )
    vm.sender = account
    contract.verify_x_binding(proof_url)
    return proof_url, challenge


def register(
    contract,
    vm,
    account,
    *,
    identity_id="1234567890123456789",
    handle="credence_user",
    tweet_id="2042000000000000001",
):
    begin_binding(contract, vm, account)
    return complete_binding(
        contract,
        vm,
        account,
        identity_id=identity_id,
        handle=handle,
        tweet_id=tweet_id,
    )


def resolve(
    contract,
    vm,
    outcome,
    *,
    claim_id="fed-september-cut",
    at="2026-08-14T12:00:00+00:00",
):
    vm.clear_mocks()
    vm.mock_web(
        r".*example\.com/fed-statement.*",
        {"status": 200, "body": "Official decision evidence"},
    )
    vm.mock_llm(
        r".*Resolve one person's reputation-backed claim.*",
        json.dumps({"outcome": outcome}),
    )
    vm.warp(at)
    contract.resolve_claim(claim_id)


def set_available_reputation(contract, account, amount):
    value_type = contract.starting_reputation.__class__
    contract.reputation_balances[account] = value_type(amount)


def test_x_proof_activates_wallet_with_one_hundred_reputation(
    credence, direct_vm, direct_alice
):
    proof_url, challenge = register(credence, direct_vm, direct_alice)

    profile = credence.get_user_profile(direct_alice)
    identity = credence.get_identity_status(direct_alice)
    assert profile["registered"] is True
    assert profile["reputation"] == 100
    assert profile["available_reputation"] == 100
    assert profile["x_identity_status"] == "VERIFIED"
    assert identity["identity_id"] == "1234567890123456789"
    assert identity["handle"] == "credence_user"
    assert identity["proof_url"] == proof_url
    assert identity["challenge"] == challenge
    assert identity["can_claim"] is True


def test_wallet_cannot_activate_without_public_x_proof(
    credence, direct_vm, direct_alice
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("x_binding_challenge_missing"):
        credence.verify_x_binding(
            "https://x.com/credence_user/status/2042000000000000001"
        )

    challenge = begin_binding(credence, direct_vm, direct_alice)
    tweet_id = "2042000000000000002"
    direct_vm.mock_web(
        rf".*status/{tweet_id}.*",
        {
            "status": 200,
            "body": x_post_html(
                tweet_id,
                challenge + "-wrong",
                "1234567890123456789",
                "credence_user",
            ),
        },
    )
    with direct_vm.expect_revert("x_challenge_missing"):
        credence.verify_x_binding(
            f"https://x.com/credence_user/status/{tweet_id}"
        )


def test_x_account_and_wallet_are_permanently_one_to_one(
    credence, direct_vm, direct_alice, direct_bob
):
    identity_id = "3333333333333333333"
    register(
        credence,
        direct_vm,
        direct_alice,
        identity_id=identity_id,
        handle="alice_signal",
        tweet_id="2042000000000000010",
    )

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("wallet_already_bound"):
        credence.begin_x_binding()

    begin_binding(credence, direct_vm, direct_bob)
    with direct_vm.expect_revert("x_identity_already_bound"):
        complete_binding(
            credence,
            direct_vm,
            direct_bob,
            identity_id=identity_id,
            handle="alice_signal",
            tweet_id="2042000000000000011",
        )


def test_binding_challenge_expires_and_can_be_reissued(
    credence, direct_vm, direct_alice
):
    first = begin_binding(credence, direct_vm, direct_alice)
    direct_vm.warp("2026-08-21T12:00:01+00:00")
    tweet_id = "2042000000000000020"
    direct_vm.mock_web(
        rf".*status/{tweet_id}.*",
        {
            "status": 200,
            "body": x_post_html(
                tweet_id,
                first,
                "4444444444444444444",
                "alice_signal",
            ),
        },
    )
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("x_binding_challenge_expired"):
        credence.verify_x_binding(
            f"https://x.com/alice_signal/status/{tweet_id}"
        )

    credence.begin_x_binding()
    second = credence.get_binding_challenge(direct_alice)
    assert second["attempt"] == 2
    assert second["challenge"] != first
    assert second["active"] is True


def test_reply_cannot_be_used_as_identity_proof(
    credence, direct_vm, direct_alice
):
    begin_binding(credence, direct_vm, direct_alice)
    with direct_vm.expect_revert("x_proof_must_be_original_post"):
        complete_binding(
            credence,
            direct_vm,
            direct_alice,
            tweet_id="2042000000000000030",
            reply=True,
        )


def test_identity_has_verified_grace_and_stale_windows(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)

    direct_vm.warp("2026-09-12T12:00:00+00:00")
    assert credence.get_identity_status(direct_alice)["status"] == "VERIFIED"
    direct_vm.warp("2026-09-13T12:00:00+00:00")
    assert credence.get_identity_status(direct_alice)["status"] == "GRACE"
    direct_vm.warp("2026-09-20T12:00:01+00:00")
    status = credence.get_identity_status(direct_alice)
    assert status["status"] == "STALE"
    assert status["can_claim"] is False

    with direct_vm.expect_revert("x_identity_verification_required"):
        make_claim(
            credence,
            resolve_time=unix("2026-09-21T12:00:00+00:00"),
        )


def test_monthly_refresh_rechecks_the_same_x_account(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    direct_vm.warp("2026-09-20T12:00:01+00:00")
    assert credence.get_identity_status(direct_alice)["status"] == "STALE"

    direct_vm.sender = direct_alice
    credence.refresh_x_identity(direct_alice)
    refreshed = credence.get_identity_status(direct_alice)
    assert refreshed["status"] == "VERIFIED"
    assert refreshed["verified_at"] == unix("2026-09-20T12:00:01+00:00")


def test_claim_has_one_owner_and_one_personal_stake(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, stake=1)

    profile = credence.get_user_profile(direct_alice)
    claim = credence.get_claim("fed-september-cut")
    assert profile["reputation"] == 100
    assert profile["available_reputation"] == 99
    assert profile["reputation_at_risk"] == 1
    assert profile["open_claims"] == 1
    assert claim["owner"] == str(direct_alice).lower()
    assert claim["stake"] == 1
    assert claim["status"] == "OPEN"
    assert "yes_stake" not in claim
    assert "no_stake" not in claim
    assert "participant_count" not in claim


def test_stake_cannot_exceed_twenty_percent(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    with direct_vm.expect_revert("stake_above_limit"):
        make_claim(credence, stake=21)


def test_true_false_and_void_keep_unilateral_settlement_math(
    credence, direct_vm, direct_alice, direct_bob, direct_charlie
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, claim_id="alice-true", stake=1)
    resolve(credence, direct_vm, "TRUE", claim_id="alice-true")
    assert credence.get_user_profile(direct_alice)["reputation"] == 101

    register(
        credence,
        direct_vm,
        direct_bob,
        identity_id="2222222222222222222",
        handle="bob_signal",
        tweet_id="2042000000000000041",
    )
    make_claim(
        credence,
        claim_id="bob-false",
        stake=5,
        resolve_time=unix("2026-08-15T12:00:00+00:00"),
    )
    resolve(
        credence,
        direct_vm,
        "FALSE",
        claim_id="bob-false",
        at="2026-08-15T12:00:00+00:00",
    )
    assert credence.get_user_profile(direct_bob)["reputation"] == 95

    register(
        credence,
        direct_vm,
        direct_charlie,
        identity_id="5555555555555555555",
        handle="charlie_signal",
        tweet_id="2042000000000000042",
    )
    make_claim(
        credence,
        claim_id="charlie-void",
        stake=10,
        resolve_time=unix("2026-08-16T12:00:00+00:00"),
    )
    resolve(
        credence,
        direct_vm,
        "VOID",
        claim_id="charlie-void",
        at="2026-08-16T12:00:00+00:00",
    )
    assert credence.get_user_profile(direct_charlie)["reputation"] == 100

    stats = credence.get_protocol_stats()
    assert stats["total_bonus_minted"] == 1
    assert stats["total_reputation_burned"] == 5


def test_falling_below_twenty_starts_seven_day_recovery(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    set_available_reputation(credence, direct_alice, 20)
    make_claim(credence, stake=1)
    resolve(credence, direct_vm, "FALSE")

    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 19
    assert profile["open_claims"] == 0
    assert profile["recovery_active"] is True
    assert profile["recoverable_reputation"] == 0
    assert profile["recovery_next_at"] == unix("2026-08-21T12:00:00+00:00")


def test_recovery_accrues_one_point_daily_and_never_exceeds_one_hundred(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    set_available_reputation(credence, direct_alice, 19)
    direct_vm.sender = direct_alice
    credence.start_recovery()

    direct_vm.warp("2026-08-20T12:00:00+00:00")
    assert credence.get_user_profile(direct_alice)["recoverable_reputation"] == 1
    credence.claim_recovery()
    assert credence.get_user_profile(direct_alice)["reputation"] == 20

    set_available_reputation(credence, direct_alice, 99)
    direct_vm.warp("2026-08-21T12:00:00+00:00")
    credence.claim_recovery()
    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 100
    assert profile["recovery_active"] is False
    assert profile["recovered_reputation"] == 2


def test_making_a_claim_cancels_recovery(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    set_available_reputation(credence, direct_alice, 19)
    direct_vm.sender = direct_alice
    credence.start_recovery()
    make_claim(credence, stake=1)
    profile = credence.get_user_profile(direct_alice)
    assert profile["recovery_active"] is False
    assert profile["recovery_next_at"] == 0


def test_only_a_correct_claim_can_move_reputation_above_one_hundred(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    set_available_reputation(credence, direct_alice, 19)
    direct_vm.sender = direct_alice
    credence.start_recovery()
    set_available_reputation(credence, direct_alice, 99)
    direct_vm.warp("2026-08-21T12:00:00+00:00")
    credence.claim_recovery()
    assert credence.get_user_profile(direct_alice)["reputation"] == 100

    make_claim(
        credence,
        claim_id="win-above-one-hundred",
        stake=1,
        resolve_time=unix("2026-08-22T12:00:00+00:00"),
    )
    resolve(
        credence,
        direct_vm,
        "TRUE",
        claim_id="win-above-one-hundred",
        at="2026-08-22T12:00:00+00:00",
    )
    assert credence.get_user_profile(direct_alice)["reputation"] == 101


def test_claim_cannot_resolve_before_its_time(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence)
    with direct_vm.expect_revert("resolution_window_not_open"):
        credence.resolve_claim("fed-september-cut")
