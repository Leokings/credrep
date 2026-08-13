import json

from tests.direct.conftest import make_claim


def register(contract, vm, account):
    vm.sender = account
    contract.register_user()


def resolve(contract, vm, outcome):
    vm.mock_web(
        r".*example\.com/fed-statement.*",
        {"status": 200, "body": "Official decision evidence"},
    )
    vm.mock_llm(
        r".*Resolve one person's reputation-backed claim.*",
        json.dumps({"outcome": outcome}),
    )
    vm.warp("2026-08-14T12:00:00+00:00")
    contract.resolve_claim("fed-september-cut")


def test_registration_starts_with_one_hundred_reputation(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)

    profile = credence.get_user_profile(direct_alice)
    assert profile == {
        "registered": True,
        "reputation": 100,
        "available_reputation": 100,
        "reputation_at_risk": 0,
        "claims_made": 0,
        "resolved_claims": 0,
        "correct_claims": 0,
        "void_claims": 0,
        "accuracy_bps": 0,
    }

    with direct_vm.expect_revert("user_already_registered"):
        credence.register_user()


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
    assert claim["owner"] == str(direct_alice).lower()
    assert claim["stake"] == 1
    assert claim["status"] == "OPEN"
    assert "yes_stake" not in claim
    assert "no_stake" not in claim
    assert "participant_count" not in claim


def test_any_registered_user_can_make_their_own_claim(
    credence, direct_vm, direct_alice, direct_bob
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, claim_id="alice-fed-claim")

    register(credence, direct_vm, direct_bob)
    make_claim(credence, claim_id="bob-fed-claim", stake=2)

    assert credence.get_claim("alice-fed-claim")["owner"] == str(direct_alice).lower()
    assert credence.get_claim("bob-fed-claim")["owner"] == str(direct_bob).lower()


def test_stake_cannot_exceed_twenty_percent(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)

    with direct_vm.expect_revert("stake_above_limit"):
        make_claim(credence, stake=21)


def test_true_claim_returns_double_the_stake(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, stake=1)

    resolve(credence, direct_vm, "TRUE")

    profile = credence.get_user_profile(direct_alice)
    claim = credence.get_claim("fed-september-cut")
    assert profile["reputation"] == 101
    assert profile["available_reputation"] == 101
    assert profile["reputation_at_risk"] == 0
    assert profile["resolved_claims"] == 1
    assert profile["correct_claims"] == 1
    assert claim["status"] == "WON"
    assert claim["outcome"] == "TRUE"
    assert credence.get_protocol_stats()["total_bonus_minted"] == 1


def test_false_claim_permanently_burns_the_stake(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, stake=5)

    resolve(credence, direct_vm, "FALSE")

    profile = credence.get_user_profile(direct_alice)
    claim = credence.get_claim("fed-september-cut")
    assert profile["reputation"] == 95
    assert profile["available_reputation"] == 95
    assert profile["reputation_at_risk"] == 0
    assert profile["correct_claims"] == 0
    assert claim["status"] == "LOST"
    assert credence.get_protocol_stats()["total_reputation_burned"] == 5


def test_void_claim_returns_only_the_original_stake(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence, stake=10)

    resolve(credence, direct_vm, "VOID")

    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 100
    assert profile["available_reputation"] == 100
    assert profile["reputation_at_risk"] == 0
    assert profile["resolved_claims"] == 0
    assert profile["void_claims"] == 1
    assert credence.get_claim("fed-september-cut")["status"] == "VOID"


def test_claim_cannot_resolve_before_its_time(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    make_claim(credence)

    with direct_vm.expect_revert("resolution_window_not_open"):
        credence.resolve_claim("fed-september-cut")
