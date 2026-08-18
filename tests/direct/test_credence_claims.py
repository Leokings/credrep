import json

from eth_hash.auto import keccak


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


def farcaster_cast_html(
    challenge: str,
    fid: str,
    handle: str,
    cast_hash: str,
) -> str:
    payload = {
        "props": {
            "pageProps": {
                "cast": {
                    "hash": cast_hash,
                    "author": {"fid": int(fid), "username": handle},
                    "text": challenge,
                }
            }
        }
    }
    return (
        '<html><body><script id="__NEXT_DATA__" type="application/json">'
        + json.dumps(payload)
        + "</script></body></html>"
    )


def mock_farcaster_proof(
    vm,
    challenge,
    *,
    fid="7654321",
    handle="credrep_user",
    cast_hash="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
):
    cast_url = f"https://farcaster.xyz/{handle}/{cast_hash[:10]}"
    vm.mock_web(
        rf".*farcaster\.xyz/{handle}/{cast_hash[:10]}.*",
        {
            "status": 200,
            "body": farcaster_cast_html(challenge, fid, handle, cast_hash),
        },
    )
    vm.mock_web(
        rf".*fnames\.farcaster\.xyz/transfers\?name={handle}.*",
        {
            "status": 200,
            "body": json.dumps(
                {
                    "transfers": [
                        {
                            "username": handle,
                            "to": int(fid),
                            "server_signature": "0x" + "ab" * 64,
                        }
                    ]
                }
            ),
        },
    )
    return cast_url


def begin_binding(contract, vm, account):
    vm.sender = account
    contract.begin_x_binding()
    challenge = contract.get_binding_challenge(account)["challenge"]
    challenge_parts = challenge.split(":")
    assert challenge_parts[0] == "credrep-bind"
    assert len(challenge_parts) == 5
    assert challenge_parts[2] == "0x" + vm._contract_address.hex()
    assert challenge_parts[3] == str(account).lower()
    return challenge


def complete_binding(
    contract,
    vm,
    account,
    *,
    identity_id="1234567890123456789",
    handle="credence_user",
    tweet_id="2042000000000000001",
    farcaster_fid="7654321",
    farcaster_handle="credrep_user",
    farcaster_cast_hash="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
    farcaster_url = mock_farcaster_proof(
        vm,
        challenge,
        fid=farcaster_fid,
        handle=farcaster_handle,
        cast_hash=farcaster_cast_hash,
    )
    vm.sender = account
    contract.verify_x_binding(proof_url, farcaster_url)
    return proof_url, challenge


def register(
    contract,
    vm,
    account,
    *,
    identity_id="1234567890123456789",
    handle="credence_user",
    tweet_id="2042000000000000001",
    farcaster_fid="7654321",
    farcaster_handle="credrep_user",
    farcaster_cast_hash="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
):
    begin_binding(contract, vm, account)
    return complete_binding(
        contract,
        vm,
        account,
        identity_id=identity_id,
        handle=handle,
        tweet_id=tweet_id,
        farcaster_fid=farcaster_fid,
        farcaster_handle=farcaster_handle,
        farcaster_cast_hash=farcaster_cast_hash,
    )


def condition_id_for(market_id):
    return "0x" + format(int(market_id), "064x")


def active_market(
    market_id="2063134",
    *,
    question="Will the Federal Reserve cut rates at its September meeting?",
    outcomes=None,
    end_date=MARKET_END,
):
    return {
        "id": market_id,
        "conditionId": condition_id_for(market_id),
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


def ctf_rpc_payload(outcome):
    denominator, yes_numerator, no_numerator = {
        "YES": (1, 1, 0),
        "NO": (1, 0, 1),
        "VOID": (2, 1, 1),
    }[outcome]
    return [
        {"jsonrpc": "2.0", "id": 1, "result": hex(denominator)},
        {"jsonrpc": "2.0", "id": 2, "result": hex(yes_numerator)},
        {"jsonrpc": "2.0", "id": 3, "result": hex(no_numerator)},
    ]


def mock_ctf_resolution(vm, outcome, *, secondary_outcome=None):
    primary = json.dumps(ctf_rpc_payload(outcome)).encode()
    secondary = json.dumps(
        ctf_rpc_payload(secondary_outcome or outcome)
    ).encode()
    vm.mock_web(
        r".*polygon\.drpc\.org.*",
        {
            "response": {"status": 200, "headers": {}, "body": primary},
            "method": "POST",
        },
    )
    vm.mock_web(
        r".*polygon\.publicnode\.com.*",
        {
            "response": {"status": 200, "headers": {}, "body": secondary},
            "method": "POST",
        },
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
    mock_ctf_resolution(vm, outcome)
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
    assert identity["farcaster_fid"] == "7654321"
    assert identity["farcaster_handle"] == "credrep_user"
    assert identity["dual_source_bound"] is True
    assert identity["challenge"] == challenge
    assert identity["can_predict"] is True


def test_x_share_url_suffix_is_removed_before_verification(
    credence, direct_vm, direct_alice
):
    challenge = begin_binding(credence, direct_vm, direct_alice)
    tweet_id = "2088249671122567454"
    direct_vm.mock_web(
        rf".*status/{tweet_id}.*",
        {
            "status": 200,
            "body": x_post_html(
                tweet_id,
                challenge,
                "1234567890123456789",
                "credence_user",
            ),
        },
    )

    direct_vm.sender = direct_alice
    farcaster_url = mock_farcaster_proof(direct_vm, challenge)
    credence.verify_x_binding(
        f"https://x.com/credence_user/status/{tweet_id}?s=20#share",
        farcaster_url,
    )

    identity = credence.get_identity_status(direct_alice)
    assert identity["proof_url"] == (
        f"https://x.com/credence_user/status/{tweet_id}"
    )
    assert identity["status"] == "VERIFIED"


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
            farcaster_cast_hash=(
                "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            ),
        )


def test_farcaster_id_and_wallet_are_permanently_one_to_one(
    credence, direct_vm, direct_alice, direct_bob
):
    register(
        credence,
        direct_vm,
        direct_alice,
        identity_id="3333333333333333333",
        handle="alice_signal",
        tweet_id="2042000000000000010",
        farcaster_fid="424242",
        farcaster_handle="alicecast",
    )
    begin_binding(credence, direct_vm, direct_bob)
    with direct_vm.expect_revert("farcaster_identity_already_bound"):
        complete_binding(
            credence,
            direct_vm,
            direct_bob,
            identity_id="4444444444444444444",
            handle="bob_signal",
            tweet_id="2042000000000000011",
            farcaster_fid="424242",
            farcaster_handle="alicecast",
            farcaster_cast_hash=(
                "0xcccccccccccccccccccccccccccccccccccccccc"
            ),
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


def test_farcaster_cast_must_contain_the_same_exact_challenge(
    credence, direct_vm, direct_alice
):
    challenge = begin_binding(credence, direct_vm, direct_alice)
    tweet_id = "2042000000000000030"
    direct_vm.mock_web(
        rf".*status/{tweet_id}.*",
        {
            "status": 200,
            "body": x_post_html(
                tweet_id,
                challenge,
                "1234567890123456789",
                "credence_user",
            ),
        },
    )
    farcaster_url = mock_farcaster_proof(direct_vm, "different challenge")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("farcaster_challenge_missing"):
        credence.verify_x_binding(
            f"https://x.com/credence_user/status/{tweet_id}",
            farcaster_url,
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
    challenge_parts = challenge.split(":")
    assert challenge_parts[0] == "credrep-reverify"
    assert len(challenge_parts) == 5
    assert challenge_parts[2] == "0x" + direct_vm._contract_address.hex()
    assert challenge_parts[3] == str(direct_alice).lower()
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
    farcaster_url = mock_farcaster_proof(
        direct_vm,
        challenge,
        fid="7654321",
        handle="credrep_new",
        cast_hash="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    )
    credence.verify_x_reverification(
        f"https://x.com/credence_new/status/{tweet_id}",
        farcaster_url,
    )
    identity = credence.get_identity_status(direct_alice)
    assert identity["status"] == "VERIFIED"
    assert identity["handle"] == "credence_new"
    assert identity["farcaster_handle"] == "credrep_new"


def test_contract_syncs_only_live_binary_polymarket_questions(
    credence, direct_vm
):
    market = active_market()
    mock_market(direct_vm, market)
    credence.sync_market(market["id"])
    stored = credence.get_market(market["id"])
    assert stored["question"] == market["question"]
    assert stored["source_url"].startswith("https://polymarket.com/event/")
    assert stored["condition_id"] == market["conditionId"]
    assert stored["settlement_source"] == "Polymarket Gamma + Polygon CTF"
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


def test_resolution_requires_gamma_to_match_polygon_ctf(
    credence, direct_vm
):
    mock_market(direct_vm, active_market())
    credence.sync_market("2063134")
    direct_vm.clear_mocks()
    mock_market(direct_vm, closed_market(outcome="YES"))
    mock_ctf_resolution(direct_vm, "NO")
    direct_vm.warp("2026-08-14T12:00:01+00:00")
    with direct_vm.expect_revert("polymarket_ctf_outcome_disagreement"):
        credence.resolve_market("2063134")


def test_resolution_requires_two_polygon_rpc_providers_to_agree(
    credence, direct_vm
):
    mock_market(direct_vm, active_market())
    credence.sync_market("2063134")
    direct_vm.clear_mocks()
    mock_market(direct_vm, closed_market(outcome="YES"))
    mock_ctf_resolution(direct_vm, "YES", secondary_outcome="NO")
    direct_vm.warp("2026-08-14T12:00:01+00:00")
    with direct_vm.expect_revert("polygon_rpc_provider_disagreement"):
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


def test_anyone_can_void_a_market_after_thirty_days_and_refund_rep(
    credence, direct_vm, direct_alice, direct_bob
):
    register(credence, direct_vm, direct_alice)
    predict(credence, direct_vm, direct_alice, stake=5)

    direct_vm.sender = direct_bob
    direct_vm.warp("2026-09-13T11:59:59+00:00")
    with direct_vm.expect_revert("market_void_window_not_open"):
        credence.void_stale_market("2063134")

    direct_vm.warp("2026-09-13T12:00:00+00:00")
    credence.void_stale_market("2063134")
    market = credence.get_market("2063134")
    assert market["status"] == "VOID"
    assert market["outcome"] == "VOID"
    assert market["void_after_unix"] == 1_789_300_800

    direct_vm.sender = direct_alice
    credence.settle_prediction("2063134")
    profile = credence.get_user_profile(direct_alice)
    assert profile["reputation"] == 100
    assert profile["reputation_at_risk"] == 0
    assert profile["resolved_predictions"] == 0
    assert profile["prediction_score_bps"] == 0
    assert profile["void_predictions"] == 1


def test_upgrade_authority_is_constrained_by_seven_day_timelock(
    credence, direct_vm, direct_owner, direct_alice
):
    governance = credence.get_governance()
    assert governance["upgradeable"] is True
    assert governance["upgrade_authority"].lower() == (
        "0x" + bytes(direct_owner).hex()
    )
    assert governance["market_void_timeout_seconds"] == 30 * 24 * 60 * 60
    assert governance["upgrade_delay_seconds"] == 7 * 24 * 60 * 60
    assert governance["upgrade_pending"] is False

    replacement = b"replacement"
    code_hash = keccak(replacement).hex()

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only_upgrade_authority"):
        credence.schedule_upgrade(code_hash)

    direct_vm.sender = direct_owner
    credence.schedule_upgrade(code_hash)
    governance = credence.get_governance()
    assert governance["upgrade_pending"] is True
    assert governance["pending_upgrade_code_hash"] == code_hash

    direct_vm.warp("2026-08-20T11:59:59+00:00")
    with direct_vm.expect_revert("upgrade_delay_active"):
        credence.execute_upgrade(replacement)

    direct_vm.warp("2026-08-20T12:00:00+00:00")
    with direct_vm.expect_revert("upgrade_code_hash_mismatch"):
        credence.execute_upgrade(b"different")
    credence.cancel_upgrade()
    assert credence.get_governance()["upgrade_pending"] is False
    with direct_vm.expect_revert("upgrade_not_scheduled"):
        credence.execute_upgrade(replacement)

    credence.schedule_upgrade(code_hash)
    direct_vm.warp("2026-08-27T12:00:00+00:00")
    credence.execute_upgrade(replacement)


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
