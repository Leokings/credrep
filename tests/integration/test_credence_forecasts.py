import json
from datetime import datetime, timezone
from urllib.request import Request, urlopen

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


GAMMA_FEED = (
    "https://gamma-api.polymarket.com/markets"
    "?active=true&closed=false&limit=100&order=volume24hr&ascending=false"
)


def active_binary_market() -> dict:
    request = Request(
        GAMMA_FEED,
        headers={
            "Accept": "application/json",
            "User-Agent": "Credence-Market-Verifier/1.0",
        },
    )
    with urlopen(request, timeout=30) as response:
        markets = json.loads(response.read().decode("utf-8"))
    now = datetime.now(timezone.utc).timestamp()
    for market in markets:
        outcomes = json.loads(market.get("outcomes", "[]"))
        end_at = datetime.fromisoformat(
            str(market.get("endDate", "")).replace("Z", "+00:00")
        ).timestamp()
        if (
            outcomes == ["Yes", "No"]
            and market.get("active") is True
            and market.get("closed") is not True
            and market.get("acceptingOrders") is True
            and end_at > now + 900
        ):
            return market
    raise AssertionError("No active binary Polymarket question was available")


def test_live_polymarket_question_reaches_genlayer_consensus():
    source_market = active_binary_market()
    factory = get_contract_factory(contract_file_path="credence_claims.py")
    contract = factory.deploy(args=[100, 2_000], wait_retries=180)

    receipt = contract.sync_market(
        args=[str(source_market["id"])]
    ).transact(wait_retries=240)
    assert tx_execution_succeeded(receipt)

    stored = contract.get_market(args=[str(source_market["id"])]).call()
    assert stored["question"] == " ".join(source_market["question"].split())
    assert stored["status"] == "OPEN"
    assert stored["source_url"].startswith("https://polymarket.com/event/")
    assert stored["void_after_unix"] == int(
        datetime.fromisoformat(
            str(source_market["endDate"]).replace("Z", "+00:00")
        ).timestamp()
    ) + (30 * 24 * 60 * 60)
    assert contract.get_protocol_stats().call()["markets"] == 1
    governance = contract.get_governance().call()
    assert governance["upgradeable"] is True
    assert governance["market_void_timeout_seconds"] == 30 * 24 * 60 * 60
