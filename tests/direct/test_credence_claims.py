import json


MARKET_END = "2026-08-14T12:00:00Z"


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


def active_market(
    market_id="2063134",
    *,
    question="Will the Federal Reserve cut rates at its September meeting?",
    outcomes=None,
    end_date=MARKET_END,
):
    return {
        "id": market_id,
        "question": question,
        "slug": f"fed-september-cut-{market_id}",
        "description": "Resolves Yes if the target range is lower after the meeting.",
        "outcomes": json.dumps(outcomes or ["Yes", "No"]),
        "endDate": end_date,
        "active": True,
        "closed": False,
        "acceptingOrders": True,
        "outcomePrices": '["0.48","0.52"]',
    }


def closed_market(market_id="2063134", *, outcome="YES"):
    market = active_market(market_id)
    market.update(
        {
            "active": False,
            "closed": True,
            "acceptingOrders": False,
            "outcomePrices": {
                "YES": '["1","0"]',
                "NO": '["0","1"]',
                "VOID": '["0.5","0.5"]',
            }[outcome],
        }
    )
    return market


def mock_market(vm, payload):
    market_id = payload["id"]
    vm.mock_web(
        rf".*gamma-api\.polymarket\.com/markets/{market_id}.*",
        {"status": 200, "body": json.dumps(payload)},
    )


def predict(
    contract,
    vm,
    account,
    *,
    market_id="2063134",
    selection="YES",
    confidence=8000,
    stake=1,
):
    vm.sender = account
    mock_market(vm, active_market(market_id))
    contract.make_prediction(market_id, selection, confidence, stake)


def resolve_and_settle(
    contract,
    vm,
    account,
    *,
    market_id="2063134",
    outcome="YES",
):
    vm.clear_mocks()
    mock_market(vm, closed_market(market_id, outcome=outcome))
    vm.warp("2026-08-14T12:00:01+00:00")
    contract.resolve_market(market_id)
    vm.sender = account
    contract.settle_prediction(market_id)


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
    assert profile["prediction_score_bps"] == 0
    assert identity["identity_id"] == "1234567890123456789"
    assert identity["proof_url"] == proof_url
    assert identity["challenge"] == challenge
    assert identity["can_predict"] is True


def test_x_account_and_wallet_are_permanently_one_to_one(
    credence, direct_vm, direct_alice, direct_bob
):
    register(
        credence,
        direct_vm,
        direct_alice,
        identity_id="3333333333333333333",
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
            identity_id="3333333333333333333",
            handle="alice_signal",
            tweet_id="2042000000000000011",
        )


def test_reply_cannot_be_used_as_identity_proof(
    credence, direct_vm, direct_alice
):
    begin_binding(credence, direct_vm, direct_alice)
    with direct_vm.expect_revert("x_proof_must_be_original_post"):
        complete_binding(
            credence,
            direct_vm,
            direct_alice,
            reply=True,
        )


def test_stale_x_identity_cannot_predict(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    direct_vm.warp("2026-09-20T12:00:00+00:00")
    assert credence.get_identity_status(direct_alice)["status"] == "STALE"
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("x_identity_verification_required"):
        credence.make_prediction("2063134", "YES", 8000, 1)


def test_reverification_requires_fresh_post_from_same_x_account(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    direct_vm.warp("2026-09-08T12:00:00+00:00")
    direct_vm.sender = direct_alice
    credence.begin_x_reverification()
    challenge = credence.get_binding_challenge(direct_alice)["challenge"]
    tweet_id = "2042000000000000090"
    mock = x_post_html(
        tweet_id,
        challenge,
        "1234567890123456789",
        "credence_new",
    )
    direct_vm.mock_web(
        rf".*status/{tweet_id}.*", {"status": 200, "body": mock}
    )
    credence.verify_x_reverification(
        f"https://x.com/credence_new/status/{tweet_id}"
    )
    identity = credence.get_identity_status(direct_alice)
    assert identity["status"] == "VERIFIED"
    assert identity["handle"] == "credence_new"


def test_contract_syncs_only_live_binary_polymarket_questions(
    credence, direct_vm
):
    market = active_market()
    mock_market(direct_vm, market)
    credence.sync_market(market["id"])
    stored = credence.get_market(market["id"])
    assert stored["question"] == market["question"]
    assert stored["source_url"].startswith("https://polymarket.com/event/")
    assert stored["status"] == "OPEN"
    assert "outcomePrices" not in stored

    non_binary = active_market("2063135", outcomes=["A", "B", "C"])
    direct_vm.clear_mocks()
    mock_market(direct_vm, non_binary)
    with direct_vm.expect_revert("market_is_not_binary_yes_no"):
        credence.sync_market("2063135")


def test_prediction_is_one_person_backing_one_side_not_a_pool(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    predict(credence, direct_vm, direct_alice, stake=5)

    profile = credence.get_user_profile(direct_alice)
    position = credence.get_position(direct_alice, "2063134")
    market = credence.get_market("2063134")
    assert profile["available_reputation"] == 95
    assert profile["reputation_at_risk"] == 5
    assert position["prediction"] == "YES"
    assert position["confidence_bps"] == 8000
    assert position["stake"] == 5
    assert market["prediction_count"] == 1
    assert "yes_stake" not in market
    assert "no_stake" not in market

    with direct_vm.expect_revert("prediction_already_exists"):
        credence.make_prediction("2063134", "NO", 7000, 1)


def test_stake_and_confidence_limits_are_enforced(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    mock_market(direct_vm, active_market())
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("stake_above_limit"):
        credence.make_prediction("2063134", "YES", 8000, 21)
    with direct_vm.expect_revert("confidence_out_of_range"):
        credence.make_prediction("2063134", "YES", 9900, 1)


def test_market_cannot_resolve_before_its_source_deadline(
    credence, direct_vm
):
    mock_market(direct_vm, active_market())
    credence.sync_market("2063134")
    with direct_vm.expect_revert("market_resolution_window_not_open"):
        credence.resolve_market("2063134")


def test_correct_prediction_doubles_stake_and_scores_calibration(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    predict(credence, direct_vm, direct_alice, confidence=8000, stake=5)
    resolve_and_settle(credence, direct_vm, direct_alice, outcome="YES")

    profile = credence.get_user_profile(direct_alice)
    position = credence.get_position(direct_alice, "2063134")
    assert profile["reputation"] == 105
    assert profile["available_reputation"] == 105
    assert profile["reputation_at_risk"] == 0
    assert profile["correct_predictions"] == 1
    assert profile["accuracy_bps"] == 10_000
    assert profile["prediction_score_bps"] == 9_600
    assert position["status"] == "WON"
    assert position["score_bps"] == 9_600


def test_wrong_prediction_burns_stake_and_confidence_hurts_score(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    predict(
        credence,
        direct_vm,
        direct_alice,
        selection="NO",
        confidence=9000,
        stake=5,
    )
    resolve_and_settle(credence, direct_vm, direct_alice, outcome="YES")

    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 95
    assert profile["accuracy_bps"] == 0
    assert profile["prediction_score_bps"] == 1_900
    assert credence.get_position(direct_alice, "2063134")["status"] == "LOST"


def test_void_market_refunds_rep_without_affecting_prediction_score(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    predict(credence, direct_vm, direct_alice, stake=5)
    resolve_and_settle(credence, direct_vm, direct_alice, outcome="VOID")

    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 100
    assert profile["resolved_predictions"] == 0
    assert profile["prediction_score_bps"] == 0
    assert profile["void_predictions"] == 1


def test_score_averages_calibration_across_resolved_predictions(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    predict(
        credence,
        direct_vm,
        direct_alice,
        market_id="2063134",
        confidence=9500,
    )
    direct_vm.clear_mocks()
    predict(
        credence,
        direct_vm,
        direct_alice,
        market_id="2063135",
        confidence=5000,
    )

    resolve_and_settle(
        credence, direct_vm, direct_alice, market_id="2063134", outcome="YES"
    )
    direct_vm.clear_mocks()
    resolve_and_settle(
        credence, direct_vm, direct_alice, market_id="2063135", outcome="YES"
    )
    profile = credence.get_user_profile(direct_alice)
    assert profile["resolved_predictions"] == 2
    assert profile["prediction_score_bps"] == (9_975 + 7_500) // 2


def test_loss_below_twenty_starts_recovery_and_recovery_caps_at_one_hundred(
    credence, direct_vm, direct_alice
):
    register(credence, direct_vm, direct_alice)
    set_available_reputation(credence, direct_alice, 19)
    predict(credence, direct_vm, direct_alice, stake=1)
    resolve_and_settle(credence, direct_vm, direct_alice, outcome="NO")
    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 18
    assert profile["recovery_active"] is True

    direct_vm.warp("2026-09-10T12:00:01+00:00")
    direct_vm.sender = direct_alice
    credence.claim_recovery()
    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 39

    value_type = credence.starting_reputation.__class__
    credence.identity_verified_until[direct_alice] = value_type(2_000_000_000)
    direct_vm.warp("2027-01-01T12:00:01+00:00")
    credence.claim_recovery()
    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 100
    assert profile["recovery_active"] is False
