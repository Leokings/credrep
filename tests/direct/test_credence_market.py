import json

from tests.direct.conftest import create_market


def test_registration_is_one_time_and_non_transferable(
    credence, direct_vm, direct_alice
):
    direct_vm.sender = direct_alice
    credence.register_user()

    profile = credence.get_user_profile(direct_alice)
    assert profile["registered"] is True
    assert profile["credits"] == 100
    assert profile["overall_rating"] == 500

    with direct_vm.expect_revert("user_already_registered"):
        credence.register_user()


def test_only_owner_can_create_markets(
    credence, direct_vm, direct_alice
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only_owner"):
        create_market(credence)


def test_forecasts_lock_credits_and_enforce_limits(
    credence, direct_vm, direct_owner, direct_alice
):
    direct_vm.sender = direct_owner
    market_id = create_market(credence)

    direct_vm.sender = direct_alice
    credence.register_user()
    credence.place_forecast(market_id, "YES", 7_000, 20)

    profile = credence.get_user_profile(direct_alice)
    forecast = credence.get_forecast(market_id, direct_alice)
    market = credence.get_market(market_id)

    assert profile["credits"] == 80
    assert forecast == {
        "exists": True,
        "market_id": market_id,
        "account": str(direct_alice).lower(),
        "outcome": "YES",
        "confidence_bps": 7_000,
        "stake": 20,
        "status": "OPEN",
    }
    assert market["yes_stake"] == 20
    assert market["forecast_count"] == 1

    with direct_vm.expect_revert("forecast_already_exists"):
        credence.place_forecast(market_id, "NO", 6_000, 1)


def test_stake_cannot_exceed_twenty_percent(
    credence, direct_vm, direct_owner, direct_alice
):
    direct_vm.sender = direct_owner
    market_id = create_market(credence)

    direct_vm.sender = direct_alice
    credence.register_user()
    with direct_vm.expect_revert("stake_above_limit"):
        credence.place_forecast(market_id, "YES", 7_000, 21)


def test_resolution_settles_pool_and_updates_category_reputation(
    credence, direct_vm, direct_owner, direct_alice, direct_bob
):
    direct_vm.sender = direct_owner
    market_id = create_market(credence)

    direct_vm.sender = direct_alice
    credence.register_user()
    credence.place_forecast(market_id, "YES", 7_000, 20)

    direct_vm.sender = direct_bob
    credence.register_user()
    credence.place_forecast(market_id, "NO", 6_000, 20)

    direct_vm.warp("2026-08-13T13:01:00+00:00")
    direct_vm.mock_web(
        r".*example\.com/match-report.*",
        {
            "status": 200,
            "body": "Manchester United won the completed match 2-1.",
        },
    )
    direct_vm.mock_llm(
        r".*Resolve a binary forecasting market.*",
        json.dumps({"outcome": "YES"}),
    )

    credence.resolve_market(market_id)

    assert credence.get_market(market_id)["outcome"] == "YES"
    assert credence.get_market(market_id)["status"] == "RESOLVED"
    assert credence.get_user_profile(direct_alice)["credits"] == 120
    assert credence.get_user_profile(direct_bob)["credits"] == 80
    assert credence.get_forecast(market_id, direct_alice)["status"] == "WON"
    assert credence.get_forecast(market_id, direct_bob)["status"] == "LOST"

    alice_football = credence.get_rating(direct_alice, "football")
    bob_football = credence.get_rating(direct_bob, "football")
    assert alice_football["rating"] == 516
    assert alice_football["average_brier"] == 900
    assert bob_football["rating"] == 489
    assert bob_football["average_brier"] == 3_600


def test_void_resolution_returns_every_stake(
    credence, direct_vm, direct_owner, direct_alice, direct_bob
):
    direct_vm.sender = direct_owner
    market_id = create_market(credence, market_id="abandoned-match")

    direct_vm.sender = direct_alice
    credence.register_user()
    credence.place_forecast(market_id, "YES", 8_000, 10)

    direct_vm.sender = direct_bob
    credence.register_user()
    credence.place_forecast(market_id, "NO", 7_000, 10)

    direct_vm.warp("2026-08-13T13:01:00+00:00")
    direct_vm.mock_web(
        r".*example\.com/match-report.*",
        {"status": 200, "body": "The match was abandoned and not replayed."},
    )
    direct_vm.mock_llm(
        r".*Resolve a binary forecasting market.*",
        json.dumps({"outcome": "VOID"}),
    )

    credence.resolve_market(market_id)

    assert credence.get_user_profile(direct_alice)["credits"] == 100
    assert credence.get_user_profile(direct_bob)["credits"] == 100
    assert credence.get_user_profile(direct_alice)["resolved_forecasts"] == 0
    assert credence.get_protocol_stats()["reserve_credits"] == 0


def test_resolution_cannot_run_before_lock(
    credence, direct_vm, direct_owner
):
    direct_vm.sender = direct_owner
    market_id = create_market(credence)
    with direct_vm.expect_revert("resolution_window_not_open"):
        credence.resolve_market(market_id)
