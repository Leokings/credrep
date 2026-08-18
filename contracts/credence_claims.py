# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
from datetime import datetime
from typing import Any, NoReturn, cast


ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"

OUTCOME_VOID = "VOID"

PREDICTION_YES = "YES"
PREDICTION_NO = "NO"

MARKET_OPEN = "OPEN"
MARKET_RESOLVED = "RESOLVED"
MARKET_VOID = "VOID"

POSITION_OPEN = "OPEN"
POSITION_WON = "WON"
POSITION_LOST = "LOST"
POSITION_VOID = "VOID"

X_CHALLENGE_VALIDITY_SECONDS = 7 * 24 * 60 * 60
X_VERIFICATION_VALIDITY_SECONDS = 30 * 24 * 60 * 60
X_VERIFICATION_GRACE_SECONDS = 7 * 24 * 60 * 60
X_REVERIFICATION_WINDOW_SECONDS = 7 * 24 * 60 * 60
MAX_X_PROOF_BYTES = 300_000
MAX_X_TARGET_SECTION_BYTES = 50_000
FARCASTER_SITE_ROOT = "https://farcaster.xyz/"
FARCASTER_FNAME_API_ROOT = "https://fnames.farcaster.xyz/transfers?name="
MAX_FARCASTER_CAST_BYTES = 300_000
MAX_FARCASTER_FNAME_BYTES = 100_000

CHALLENGE_PURPOSE_BIND = "BIND"
CHALLENGE_PURPOSE_REVERIFY = "REVERIFY"

IDENTITY_UNBOUND = "UNBOUND"
IDENTITY_PENDING = "PENDING"
IDENTITY_VERIFIED = "VERIFIED"
IDENTITY_GRACE = "GRACE"
IDENTITY_STALE = "STALE"

RECOVERY_TRIGGER_BELOW = 20
RECOVERY_TARGET = 100
RECOVERY_COOLDOWN_SECONDS = 7 * 24 * 60 * 60
RECOVERY_STEP_SECONDS = 24 * 60 * 60
MARKET_VOID_TIMEOUT_SECONDS = 30 * 24 * 60 * 60

POLYMARKET_API_ROOT = "https://gamma-api.polymarket.com/markets/"
POLYMARKET_SITE_ROOT = "https://polymarket.com/event/"
POLYMARKET_CTF_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
POLYGON_RPC_PRIMARY = "https://polygon.drpc.org"
POLYGON_RPC_SECONDARY = "https://polygon.publicnode.com"
PAYOUT_DENOMINATOR_SELECTOR = "dd34de67"
PAYOUT_NUMERATOR_SELECTOR = "0504c814"
MAX_MARKET_BODY_BYTES = 200_000
MAX_MARKET_QUESTION_LENGTH = 500
MAX_MARKET_DESCRIPTION_LENGTH = 2_000
MIN_CONFIDENCE_BPS = 5_000
MAX_CONFIDENCE_BPS = 9_500
UPGRADE_DELAY_SECONDS = 7 * 24 * 60 * 60


def _expected(message: str) -> NoReturn:
    raise gl.vm.UserError(f"{ERROR_EXPECTED} {message}")


def _external(message: str) -> NoReturn:
    raise gl.vm.UserError(f"{ERROR_EXTERNAL} {message}")


def _transient(message: str) -> NoReturn:
    raise gl.vm.UserError(f"{ERROR_TRANSIENT} {message}")


def _now_unix() -> int:
    raw = str(gl.message_raw["datetime"])
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            _expected("invalid_transaction_datetime")
        return int(parsed.timestamp())
    except (ValueError, TypeError, OverflowError):
        _expected("invalid_transaction_datetime")


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _address_key(account: Address) -> str:
    return str(account).lower()


def _normalize_x_proof_url(raw: str) -> tuple[str, str, str]:
    value = raw.strip()
    if len(value) < 20 or len(value) > 300 or not value.startswith("https://"):
        _expected("invalid_x_proof_url")

    # X appends harmless share parameters such as `?s=20` to copied post URLs.
    # They are not part of the proof identity, so remove them before validating
    # and fetching the canonical post URL.
    value = value.split("#", 1)[0].split("?", 1)[0]

    path = value[8:].strip("/")
    parts = path.split("/")
    if len(parts) != 4:
        _expected("invalid_x_proof_url")

    host = parts[0].lower()
    if host.startswith("www."):
        host = host[4:]
    if host not in ("x.com", "twitter.com"):
        _expected("invalid_x_proof_host")

    handle = parts[1]
    if parts[2].lower() != "status":
        _expected("invalid_x_proof_url")
    _normalize_x_handle(handle)

    tweet_id = parts[3]
    if len(tweet_id) < 5 or len(tweet_id) > 32 or not tweet_id.isdigit():
        _expected("invalid_x_post_id")
    return f"https://x.com/{handle}/status/{tweet_id}", handle, tweet_id


def _normalize_x_handle(raw: str) -> str:
    handle = raw.strip().lstrip("@").lower()
    if len(handle) < 1 or len(handle) > 15:
        _expected("invalid_x_handle")
    for character in handle:
        if not (
            character.isascii()
            and (character.isalnum() or character == "_")
        ):
            _expected("invalid_x_handle")
    return handle


def _normalize_x_identity_id(raw: str) -> str:
    identity_id = raw.strip()
    if len(identity_id) < 1 or len(identity_id) > 32 or not identity_id.isdigit():
        _transient("x_identity_id_unreadable")
    return identity_id


def _extract_x_identity_from_html(
    html: str, tweet_id: str, challenge: str
) -> str:
    tweet_marker = f'__typename:"Tweet",rest_id:"{tweet_id}"'
    start = html.find(tweet_marker)
    if start < 0:
        _transient("x_proof_post_unreadable")

    next_start = html.find(
        '__typename:"Tweet",rest_id:"', start + len(tweet_marker)
    )
    hard_end = min(len(html), start + MAX_X_TARGET_SECTION_BYTES)
    end = hard_end if next_start < 0 else min(hard_end, next_start)
    section = html[start:end]

    header = section[:3_000]
    if "reply_to_results:" not in header or "reply_to_user_results:" not in header:
        _transient("x_proof_shape_unreadable")
    if (
        "reply_to_results:null" not in header
        or "reply_to_user_results:null" not in header
    ):
        _expected("x_proof_must_be_original_post")

    full_text_marker = 'full_text:"'
    text_start = section.find(full_text_marker)
    if text_start < 0:
        _transient("x_post_text_unreadable")
    text_start += len(full_text_marker)
    text_end = section.find('",hashtag_entities:', text_start)
    if text_end < 0:
        _transient("x_post_text_unreadable")
    if section[text_start:text_end].strip() != challenge:
        _expected("x_challenge_missing")

    identity_marker = '__typename:"User",rest_id:"'
    identity_start = section.find(identity_marker)
    if identity_start < 0:
        _transient("x_identity_unreadable")
    identity_start += len(identity_marker)
    identity_end = section.find('"', identity_start)
    if identity_end < 0:
        _transient("x_identity_unreadable")
    identity_id = _normalize_x_identity_id(section[identity_start:identity_end])

    handle_marker = 'screen_name:"'
    handle_start = section.find(handle_marker, identity_end)
    if handle_start < 0:
        _transient("x_handle_unreadable")
    handle_start += len(handle_marker)
    handle_end = section.find('"', handle_start)
    if handle_end < 0:
        _transient("x_handle_unreadable")
    handle = _normalize_x_handle(section[handle_start:handle_end])

    return _canonical_json(
        {
            "handle": handle,
            "identity_id": identity_id,
            "tweet_id": tweet_id,
            "valid": True,
        }
    )


def _parse_x_identity_result(raw: str) -> dict[str, str]:
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        _transient("x_consensus_result_unreadable")
    if not isinstance(parsed, dict) or parsed.get("valid") is not True:
        _transient("x_consensus_result_unreadable")
    identity_id = _normalize_x_identity_id(str(parsed.get("identity_id", "")))
    handle = _normalize_x_handle(str(parsed.get("handle", "")))
    tweet_id = str(parsed.get("tweet_id", "")).strip()
    if len(tweet_id) < 5 or len(tweet_id) > 32 or not tweet_id.isdigit():
        _transient("x_post_id_unreadable")
    return {
        "identity_id": identity_id,
        "handle": handle,
        "tweet_id": tweet_id,
    }


def _normalize_farcaster_handle(raw: str) -> str:
    handle = raw.strip().lstrip("@").lower()
    if len(handle) < 1 or len(handle) > 32:
        _expected("invalid_farcaster_handle")
    for character in handle:
        if not (
            character.isascii()
            and (character.isalnum() or character in "-_.")
        ):
            _expected("invalid_farcaster_handle")
    if handle[0] in "-_." or handle[-1] in "-_.":
        _expected("invalid_farcaster_handle")
    return handle


def _normalize_farcaster_fid(raw: Any) -> str:
    value = str(raw).strip()
    if len(value) < 1 or len(value) > 20 or not value.isdigit():
        _transient("farcaster_fid_unreadable")
    if int(value) < 1:
        _transient("farcaster_fid_unreadable")
    return value


def _normalize_farcaster_hash(raw: Any, minimum_hex_length: int) -> str:
    value = str(raw).strip().lower()
    if (
        not value.startswith("0x")
        or len(value) < minimum_hex_length + 2
        or len(value) > 42
    ):
        _expected("invalid_farcaster_cast_hash")
    for character in value[2:]:
        if not (
            character.isascii()
            and (character.isdigit() or character in "abcdef")
        ):
            _expected("invalid_farcaster_cast_hash")
    return value


def _normalize_farcaster_cast_url(raw: str) -> tuple[str, str, str]:
    value = raw.strip()
    if len(value) < 30 or len(value) > 300 or not value.startswith("https://"):
        _expected("invalid_farcaster_cast_url")
    value = value.split("#", 1)[0].split("?", 1)[0]
    path = value[8:].strip("/")
    parts = path.split("/")
    if len(parts) != 3 or parts[0].lower() != "farcaster.xyz":
        _expected("invalid_farcaster_cast_url")
    handle = _normalize_farcaster_handle(parts[1])
    hash_prefix = _normalize_farcaster_hash(parts[2], 8)
    return f"{FARCASTER_SITE_ROOT}{handle}/{hash_prefix}", handle, hash_prefix


def _extract_farcaster_identity(
    html: str, expected_handle: str, hash_prefix: str, challenge: str
) -> str:
    marker = 'id="__NEXT_DATA__"'
    marker_start = html.find(marker)
    if marker_start < 0:
        _transient("farcaster_cast_data_unreadable")
    json_start = html.find(">", marker_start)
    json_end = html.find("</script>", json_start + 1)
    if json_start < 0 or json_end < 0:
        _transient("farcaster_cast_data_unreadable")
    try:
        payload = json.loads(html[json_start + 1 : json_end])
        cast_data = payload["props"]["pageProps"]["cast"]
    except (ValueError, TypeError, KeyError):
        _transient("farcaster_cast_data_unreadable")
    if not isinstance(cast_data, dict):
        _transient("farcaster_cast_data_unreadable")
    cast_value = cast(dict[str, Any], cast_data)
    cast_hash = _normalize_farcaster_hash(cast_value.get("hash", ""), 40)
    if len(cast_hash) != 42 or not cast_hash.startswith(hash_prefix):
        _expected("farcaster_cast_hash_mismatch")
    if str(cast_value.get("text", "")).strip() != challenge:
        _expected("farcaster_challenge_missing")

    author = cast_value.get("author")
    if not isinstance(author, dict):
        _transient("farcaster_author_unreadable")
    author_data = cast(dict[str, Any], author)
    handle = _normalize_farcaster_handle(
        str(author_data.get("username", ""))
    )
    if handle != expected_handle:
        _expected("farcaster_cast_author_mismatch")
    fid = _normalize_farcaster_fid(author_data.get("fid", ""))
    return _canonical_json(
        {
            "cast_hash": cast_hash,
            "fid": fid,
            "handle": handle,
            "valid": True,
        }
    )


def _validate_farcaster_fname(payload: Any, handle: str, fid: str) -> None:
    if not isinstance(payload, dict):
        _external("invalid_farcaster_fname_response")
    transfers = cast(dict[str, Any], payload).get("transfers")
    if not isinstance(transfers, list):
        _external("invalid_farcaster_fname_response")
    if not transfers:
        # ENS names are resolved by Farcaster through a separate onchain path.
        # The signed cast remains sufficient for those names.
        if handle.endswith(".eth"):
            return
        _transient("farcaster_fname_unreadable")
    latest = cast(list[Any], transfers)[-1]
    if not isinstance(latest, dict):
        _external("invalid_farcaster_fname_response")
    transfer = cast(dict[str, Any], latest)
    if _normalize_farcaster_handle(str(transfer.get("username", ""))) != handle:
        _external("farcaster_fname_mismatch")
    if _normalize_farcaster_fid(transfer.get("to", "")) != fid:
        _external("farcaster_fname_fid_mismatch")
    server_signature = str(transfer.get("server_signature", "")).strip().lower()
    if len(server_signature) != 130 or not server_signature.startswith("0x"):
        _external("farcaster_fname_signature_unreadable")
    for character in server_signature[2:]:
        if not (
            character.isascii()
            and (character.isdigit() or character in "abcdef")
        ):
            _external("farcaster_fname_signature_unreadable")


def _parse_farcaster_identity_result(raw: str) -> dict[str, str]:
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        _transient("farcaster_consensus_result_unreadable")
    if not isinstance(parsed, dict) or parsed.get("valid") is not True:
        _transient("farcaster_consensus_result_unreadable")
    handle = _normalize_farcaster_handle(str(parsed.get("handle", "")))
    fid = _normalize_farcaster_fid(parsed.get("fid", ""))
    cast_hash = _normalize_farcaster_hash(parsed.get("cast_hash", ""), 40)
    if len(cast_hash) != 42:
        _transient("farcaster_cast_hash_unreadable")
    return {"cast_hash": cast_hash, "fid": fid, "handle": handle}


def _market_id(raw: Any) -> str:
    value = str(raw).strip()
    if len(value) < 1 or len(value) > 32 or not value.isdigit():
        _expected("invalid_market_id")
    return value


def _condition_id(raw: Any) -> str:
    value = str(raw).strip().lower()
    if len(value) != 66 or not value.startswith("0x"):
        _external("invalid_polymarket_condition_id")
    for character in value[2:]:
        if not (
            character.isascii()
            and (character.isdigit() or character in "abcdef")
        ):
            _external("invalid_polymarket_condition_id")
    if value[2:] == "0" * 64:
        _external("invalid_polymarket_condition_id")
    return value


def _prediction(raw: str) -> str:
    value = raw.strip().upper()
    if value not in (PREDICTION_YES, PREDICTION_NO):
        _expected("invalid_prediction")
    return value


def _position_key(account: Address, market_id: str) -> str:
    return f"{_address_key(account)}|{market_id}"


def _market_slug(raw: Any) -> str:
    value = str(raw).strip().lower()
    if len(value) < 1 or len(value) > 200:
        _external("invalid_polymarket_slug")
    for character in value:
        if not (
            character.isascii()
            and (character.isalnum() or character == "-")
        ):
            _external("invalid_polymarket_slug")
    return value


def _external_text(raw: Any, label: str, minimum: int, maximum: int) -> str:
    value = " ".join(str(raw).strip().split())
    if len(value) < minimum:
        _external(f"invalid_polymarket_{label}")
    return value[:maximum]


def _parse_iso_unix(raw: Any) -> int:
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            _external("invalid_polymarket_end_time")
        return int(parsed.timestamp())
    except (ValueError, TypeError, OverflowError):
        _external("invalid_polymarket_end_time")


def _json_array(raw: Any, label: str) -> list[Any]:
    parsed = raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except (ValueError, TypeError):
            _external(f"invalid_polymarket_{label}")
    if not isinstance(parsed, list):
        _external(f"invalid_polymarket_{label}")
    return cast(list[Any], parsed)


def _canonical_active_market(payload: Any, expected_id: str, now: int) -> str:
    if not isinstance(payload, dict):
        _external("invalid_polymarket_response")
    market = cast(dict[str, Any], payload)
    returned_id = str(market.get("id", "")).strip()
    if returned_id != expected_id:
        _external("polymarket_id_mismatch")

    outcomes = [
        str(value).strip().upper()
        for value in _json_array(market.get("outcomes"), "outcomes")
    ]
    if outcomes != [PREDICTION_YES, PREDICTION_NO]:
        _expected("market_is_not_binary_yes_no")
    if market.get("active") is not True or market.get("closed") is True:
        _expected("market_not_active")
    if market.get("acceptingOrders") is not True:
        _expected("market_not_accepting_predictions")

    end_time = _parse_iso_unix(market.get("endDate"))
    if end_time <= now + 60:
        _expected("market_prediction_window_closed")

    slug = _market_slug(market.get("slug", ""))
    question = _external_text(
        market.get("question", ""),
        "question",
        5,
        MAX_MARKET_QUESTION_LENGTH,
    )
    description = _external_text(
        market.get("description", "No additional rules supplied."),
        "description",
        1,
        MAX_MARKET_DESCRIPTION_LENGTH,
    )
    condition_id = _condition_id(market.get("conditionId", ""))
    return _canonical_json(
        {
            "condition_id": condition_id,
            "description": description,
            "end_time": end_time,
            "id": returned_id,
            "question": question,
            "slug": slug,
            "source_url": f"{POLYMARKET_SITE_ROOT}{slug}",
        }
    )


def _normalized_price(raw: Any) -> str:
    value = str(raw).strip()
    normalized = value.rstrip("0").rstrip(".") if "." in value else value
    if normalized in ("", "0"):
        return "0"
    if normalized == "0.5":
        return normalized
    if normalized == "1":
        return normalized
    _transient("polymarket_outcome_not_final")


def _canonical_market_resolution(payload: Any, expected_id: str) -> str:
    if not isinstance(payload, dict):
        _external("invalid_polymarket_response")
    market = cast(dict[str, Any], payload)
    if str(market.get("id", "")).strip() != expected_id:
        _external("polymarket_id_mismatch")
    outcomes = [
        str(value).strip().upper()
        for value in _json_array(market.get("outcomes"), "outcomes")
    ]
    if outcomes != [PREDICTION_YES, PREDICTION_NO]:
        _expected("market_is_not_binary_yes_no")
    if market.get("closed") is not True:
        _transient("polymarket_market_not_resolved")
    condition_id = _condition_id(market.get("conditionId", ""))

    prices = [
        _normalized_price(value)
        for value in _json_array(
            market.get("outcomePrices"), "outcome_prices"
        )
    ]
    if prices == ["1", "0"]:
        outcome = PREDICTION_YES
    elif prices == ["0", "1"]:
        outcome = PREDICTION_NO
    elif prices == ["0.5", "0.5"]:
        outcome = OUTCOME_VOID
    else:
        _transient("polymarket_outcome_not_final")
    return _canonical_json(
        {
            "condition_id": condition_id,
            "id": expected_id,
            "outcome": outcome,
        }
    )


def _rpc_uint_result(payload: Any, request_id: int) -> int:
    if not isinstance(payload, list):
        _external("invalid_polygon_rpc_response")
    matching: dict[str, Any] | None = None
    for value in cast(list[Any], payload):
        if not isinstance(value, dict):
            _external("invalid_polygon_rpc_response")
        item = cast(dict[str, Any], value)
        try:
            item_id = int(item.get("id", -1))
        except (ValueError, TypeError, OverflowError):
            _external("invalid_polygon_rpc_response")
        if item_id == request_id:
            matching = item
    if matching is None or matching.get("error") is not None:
        _transient("polygon_rpc_call_failed")
    raw_result = matching.get("result")
    if not isinstance(raw_result, str) or not raw_result.startswith("0x"):
        _external("invalid_polygon_rpc_result")
    hexadecimal = raw_result[2:]
    if len(hexadecimal) < 1 or len(hexadecimal) > 64:
        _external("invalid_polygon_rpc_result")
    for character in hexadecimal.lower():
        if not (
            character.isascii()
            and (character.isdigit() or character in "abcdef")
        ):
            _external("invalid_polygon_rpc_result")
    return int(hexadecimal, 16)


def _canonical_ctf_resolution(payload: Any, condition_id: str) -> str:
    denominator = _rpc_uint_result(payload, 1)
    yes_numerator = _rpc_uint_result(payload, 2)
    no_numerator = _rpc_uint_result(payload, 3)
    if denominator == 0:
        _transient("ctf_condition_not_resolved")
    if yes_numerator + no_numerator != denominator:
        _transient("ctf_payout_vector_invalid")
    if yes_numerator == denominator and no_numerator == 0:
        outcome = PREDICTION_YES
    elif yes_numerator == 0 and no_numerator == denominator:
        outcome = PREDICTION_NO
    elif yes_numerator == no_numerator and yes_numerator > 0:
        outcome = OUTCOME_VOID
    else:
        _transient("ctf_payout_vector_unsupported")
    return _canonical_json(
        {
            "condition_id": condition_id,
            "denominator": denominator,
            "no_numerator": no_numerator,
            "outcome": outcome,
            "yes_numerator": yes_numerator,
        }
    )


def _normalize_upgrade_hash(raw: str) -> str:
    value = raw.strip().lower()
    if value.startswith("0x"):
        value = value[2:]
    if len(value) != 64:
        _expected("invalid_upgrade_code_hash")
    for character in value:
        if not (
            character.isascii()
            and (character.isdigit() or character in "abcdef")
        ):
            _expected("invalid_upgrade_code_hash")
    return value


class CredrepForecasts(gl.Contract):
    starting_reputation: u256
    max_stake_bps: u256
    user_count: u256
    market_count: u256
    prediction_count: u256
    total_bonus_minted: u256
    total_reputation_burned: u256
    total_reputation_recovered: u256

    registered: TreeMap[Address, bool]
    reputation_balances: TreeMap[Address, u256]
    reputation_at_risk: TreeMap[Address, u256]
    user_prediction_counts: TreeMap[Address, u256]
    user_open_prediction_counts: TreeMap[Address, u256]
    user_resolved_counts: TreeMap[Address, u256]
    user_correct_counts: TreeMap[Address, u256]
    user_void_counts: TreeMap[Address, u256]
    user_score_sums: TreeMap[Address, u256]

    binding_attempts: TreeMap[Address, u256]
    pending_binding_challenges: TreeMap[Address, str]
    pending_binding_expires_at: TreeMap[Address, u256]
    pending_challenge_purposes: TreeMap[Address, str]
    wallet_identity_ids: TreeMap[Address, str]
    identity_wallet_addresses: TreeMap[str, str]
    identity_handles: TreeMap[Address, str]
    identity_proof_urls: TreeMap[Address, str]
    identity_challenges: TreeMap[Address, str]
    identity_verified_at: TreeMap[Address, u256]
    identity_verified_until: TreeMap[Address, u256]

    recovery_active: TreeMap[Address, bool]
    recovery_next_at: TreeMap[Address, u256]
    user_recovered_reputation: TreeMap[Address, u256]

    market_ids: DynArray[str]
    market_exists: TreeMap[str, bool]
    market_questions: TreeMap[str, str]
    market_descriptions: TreeMap[str, str]
    market_slugs: TreeMap[str, str]
    market_source_urls: TreeMap[str, str]
    market_end_times: TreeMap[str, u256]
    market_statuses: TreeMap[str, str]
    market_outcomes: TreeMap[str, str]
    market_prediction_counts: TreeMap[str, u256]
    market_total_staked: TreeMap[str, u256]
    market_synced_at: TreeMap[str, str]
    market_resolved_at: TreeMap[str, str]

    position_exists: TreeMap[str, bool]
    position_predictions: TreeMap[str, str]
    position_confidence_bps: TreeMap[str, u256]
    position_stakes: TreeMap[str, u256]
    position_statuses: TreeMap[str, str]
    position_scores_bps: TreeMap[str, u256]
    position_created_at: TreeMap[str, str]
    position_settled_at: TreeMap[str, str]
    user_position_ids: TreeMap[str, str]
    upgrade_authority: Address
    wallet_farcaster_fids: TreeMap[Address, str]
    farcaster_fid_wallet_addresses: TreeMap[str, str]
    farcaster_handles: TreeMap[Address, str]
    farcaster_proof_urls: TreeMap[Address, str]
    market_condition_ids: TreeMap[str, str]
    pending_upgrade_code_hash: str
    pending_upgrade_scheduled_at: u256
    pending_upgrade_execute_after: u256

    def __init__(self, starting_reputation: u256, max_stake_bps: u256):
        initial = int(starting_reputation)
        stake_limit = int(max_stake_bps)
        if initial < 10 or initial > 1_000_000:
            _expected("invalid_starting_reputation")
        if stake_limit < 100 or stake_limit > 5_000:
            _expected("invalid_max_stake_bps")
        self.starting_reputation = starting_reputation
        self.max_stake_bps = max_stake_bps
        self.upgrade_authority = gl.message.sender_address
        root = gl.storage.Root.get()
        root.upgraders.get().append(gl.message.sender_address)

    def _activate_user(self, account: Address) -> None:
        if self.registered.get(account, False):
            _expected("user_already_registered")
        self.registered[account] = True
        self.reputation_balances[account] = self.starting_reputation
        self.user_count = u256(int(self.user_count) + 1)

    def _identity_status_value(self, account: Address, now: int) -> str:
        if not self.wallet_identity_ids.get(account, ""):
            challenge = self.pending_binding_challenges.get(account, "")
            expires_at = int(
                self.pending_binding_expires_at.get(account, u256(0))
            )
            if challenge and now <= expires_at:
                return IDENTITY_PENDING
            return IDENTITY_UNBOUND

        if not self.wallet_farcaster_fids.get(account, ""):
            return IDENTITY_STALE

        verified_until = int(
            self.identity_verified_until.get(account, u256(0))
        )
        if now <= verified_until:
            return IDENTITY_VERIFIED
        if now <= verified_until + X_VERIFICATION_GRACE_SECONDS:
            return IDENTITY_GRACE
        return IDENTITY_STALE

    def _require_identity_active(self, account: Address) -> None:
        status = self._identity_status_value(account, _now_unix())
        if status not in (IDENTITY_VERIFIED, IDENTITY_GRACE):
            _expected("x_identity_verification_required")

    def _run_x_proof_consensus(self, proof_url: str, challenge: str) -> dict[str, str]:
        normalized_url, _, tweet_id = _normalize_x_proof_url(proof_url)

        def leader_fn() -> str:
            try:
                response = gl.nondet.web.get(
                    normalized_url,
                    headers={
                        "Accept": "text/html",
                        "Accept-Language": "en-US,en;q=0.9",
                        "User-Agent": "Mozilla/5.0 CREDREP-Identity-Verifier/3.0",
                    },
                )
            except Exception:
                _transient("x_proof_fetch_failed")

            if response.status == 429 or response.status >= 500:
                _transient(f"x_proof_http_{response.status}")
            if response.status != 200 or response.body is None:
                _external(f"x_proof_http_{response.status}")

            html = response.body[:MAX_X_PROOF_BYTES].decode(
                "utf-8", errors="replace"
            )
            return _extract_x_identity_from_html(html, tweet_id, challenge)

        def validator_fn(leaders_res: gl.vm.Result[str]) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                if not isinstance(leaders_res, gl.vm.UserError):
                    return False
                try:
                    leader_fn()
                    return False
                except gl.vm.UserError as validator_error:
                    leader_message = leaders_res.message
                    validator_message = validator_error.message
                    if leader_message.startswith(ERROR_TRANSIENT):
                        return validator_message.startswith(ERROR_TRANSIENT)
                    if leader_message.startswith(ERROR_EXTERNAL):
                        return validator_message == leader_message
                    if leader_message.startswith(ERROR_EXPECTED):
                        return validator_message == leader_message
                    return False
                except Exception:
                    return False

            try:
                leader_result = str(leaders_res.calldata)
                validator_result = leader_fn()
                return leader_result == validator_result
            except Exception:
                return False

        result = str(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))
        parsed = _parse_x_identity_result(result)
        if parsed["tweet_id"] != tweet_id:
            _transient("x_post_id_mismatch")
        return parsed

    def _run_farcaster_cast_consensus(
        self, proof_url: str, challenge: str
    ) -> dict[str, str]:
        normalized_url, expected_handle, hash_prefix = (
            _normalize_farcaster_cast_url(proof_url)
        )
        fname_url = f"{FARCASTER_FNAME_API_ROOT}{expected_handle}"

        def leader_fn() -> str:
            try:
                response = gl.nondet.web.get(
                    normalized_url,
                    headers={
                        "Accept": "text/html",
                        "Accept-Language": "en-US,en;q=0.9",
                        "User-Agent": "Twitterbot/1.0",
                    },
                )
            except Exception:
                _transient("farcaster_cast_fetch_failed")
            if response.status == 429 or response.status >= 500:
                _transient(f"farcaster_cast_http_{response.status}")
            if response.status != 200 or response.body is None:
                _external(f"farcaster_cast_http_{response.status}")
            html = response.body[:MAX_FARCASTER_CAST_BYTES].decode(
                "utf-8", errors="replace"
            )
            result = _extract_farcaster_identity(
                html, expected_handle, hash_prefix, challenge
            )
            identity = _parse_farcaster_identity_result(result)

            try:
                fname_response = gl.nondet.web.get(
                    fname_url,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "CREDREP-Identity-Verifier/4.0",
                    },
                )
            except Exception:
                _transient("farcaster_fname_fetch_failed")
            if fname_response.status == 429 or fname_response.status >= 500:
                _transient(f"farcaster_fname_http_{fname_response.status}")
            if fname_response.status != 200 or fname_response.body is None:
                _external(f"farcaster_fname_http_{fname_response.status}")
            try:
                payload = json.loads(
                    fname_response.body[:MAX_FARCASTER_FNAME_BYTES].decode(
                        "utf-8", errors="strict"
                    )
                )
            except (ValueError, UnicodeDecodeError, TypeError):
                _external("invalid_farcaster_fname_response")
            _validate_farcaster_fname(
                payload, identity["handle"], identity["fid"]
            )
            return result

        def validator_fn(leaders_res: gl.vm.Result[str]) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                if not isinstance(leaders_res, gl.vm.UserError):
                    return False
                try:
                    leader_fn()
                    return False
                except gl.vm.UserError as validator_error:
                    leader_message = leaders_res.message
                    validator_message = validator_error.message
                    if leader_message.startswith(ERROR_TRANSIENT):
                        return validator_message.startswith(ERROR_TRANSIENT)
                    if leader_message.startswith(ERROR_EXTERNAL):
                        return validator_message == leader_message
                    if leader_message.startswith(ERROR_EXPECTED):
                        return validator_message == leader_message
                    return False
                except Exception:
                    return False
            try:
                return str(leaders_res.calldata) == leader_fn()
            except Exception:
                return False

        result = str(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))
        parsed = _parse_farcaster_identity_result(result)
        if not parsed["cast_hash"].startswith(hash_prefix):
            _transient("farcaster_cast_hash_mismatch")
        if parsed["handle"] != expected_handle:
            _transient("farcaster_cast_author_mismatch")
        return parsed

    def _issue_x_challenge(self, account: Address, purpose: str) -> None:
        now = _now_unix()
        current_challenge = self.pending_binding_challenges.get(account, "")
        current_expiry = int(
            self.pending_binding_expires_at.get(account, u256(0))
        )
        if current_challenge and now <= current_expiry:
            _expected("x_verification_challenge_active")

        attempt = int(self.binding_attempts.get(account, u256(0))) + 1
        challenge_label = (
            "bind" if purpose == CHALLENGE_PURPOSE_BIND else "reverify"
        )
        challenge = (
            f"credrep-{challenge_label}:{int(gl.message.chain_id)}:"
            f"{_address_key(gl.message.contract_address)}:"
            f"{_address_key(account)}:{attempt}"
        )
        self.binding_attempts[account] = u256(attempt)
        self.pending_binding_challenges[account] = challenge
        self.pending_binding_expires_at[account] = u256(
            now + X_CHALLENGE_VALIDITY_SECONDS
        )
        self.pending_challenge_purposes[account] = purpose

    def _clear_x_challenge(self, account: Address) -> None:
        self.pending_binding_challenges[account] = ""
        self.pending_binding_expires_at[account] = u256(0)
        self.pending_challenge_purposes[account] = ""

    @gl.public.write
    def begin_x_binding(self) -> None:
        account = gl.message.sender_address
        if self.wallet_identity_ids.get(account, "") or self.registered.get(
            account, False
        ):
            _expected("wallet_already_bound")
        self._issue_x_challenge(account, CHALLENGE_PURPOSE_BIND)

    @gl.public.write
    def verify_x_binding(self, proof_url: str, farcaster_proof_url: str) -> None:
        account = gl.message.sender_address
        if self.wallet_identity_ids.get(account, "") or self.registered.get(
            account, False
        ):
            _expected("wallet_already_bound")

        challenge = self.pending_binding_challenges.get(account, "")
        purpose = self.pending_challenge_purposes.get(account, "")
        if not challenge or purpose != CHALLENGE_PURPOSE_BIND:
            _expected("x_binding_challenge_missing")
        now = _now_unix()
        if now > int(self.pending_binding_expires_at.get(account, u256(0))):
            _expected("x_binding_challenge_expired")

        verified = self._run_x_proof_consensus(proof_url, challenge)
        farcaster_verified = self._run_farcaster_cast_consensus(
            farcaster_proof_url, challenge
        )
        identity_id = verified["identity_id"]
        existing_wallet = self.identity_wallet_addresses.get(identity_id, "")
        if existing_wallet:
            _expected("x_identity_already_bound")
        farcaster_fid = farcaster_verified["fid"]
        farcaster_existing_wallet = self.farcaster_fid_wallet_addresses.get(
            farcaster_fid, ""
        )
        if farcaster_existing_wallet:
            _expected("farcaster_identity_already_bound")

        handle = verified["handle"]
        canonical_proof = (
            f"https://x.com/{handle}/status/{verified['tweet_id']}"
        )
        self.wallet_identity_ids[account] = identity_id
        self.identity_wallet_addresses[identity_id] = _address_key(account)
        self.identity_handles[account] = handle
        self.identity_proof_urls[account] = canonical_proof
        farcaster_handle = farcaster_verified["handle"]
        self.wallet_farcaster_fids[account] = farcaster_fid
        self.farcaster_fid_wallet_addresses[farcaster_fid] = (
            _address_key(account)
        )
        self.farcaster_handles[account] = farcaster_handle
        self.farcaster_proof_urls[account] = (
            f"{FARCASTER_SITE_ROOT}{farcaster_handle}/"
            f"{farcaster_verified['cast_hash']}"
        )
        self.identity_challenges[account] = challenge
        self.identity_verified_at[account] = u256(now)
        self.identity_verified_until[account] = u256(
            now + X_VERIFICATION_VALIDITY_SECONDS
        )
        self._clear_x_challenge(account)
        self._activate_user(account)

    @gl.public.write
    def begin_x_reverification(self) -> None:
        account = gl.message.sender_address
        identity_id = self.wallet_identity_ids.get(account, "")
        if not identity_id or not self.registered.get(account, False):
            _expected("x_identity_not_bound")

        now = _now_unix()
        verified_until = int(
            self.identity_verified_until.get(account, u256(0))
        )
        farcaster_fid = self.wallet_farcaster_fids.get(account, "")
        if (
            farcaster_fid
            and now + X_REVERIFICATION_WINDOW_SECONDS < verified_until
        ):
            _expected("x_reverification_not_due")
        self._issue_x_challenge(account, CHALLENGE_PURPOSE_REVERIFY)

    @gl.public.write
    def verify_x_reverification(
        self, proof_url: str, farcaster_proof_url: str
    ) -> None:
        account = gl.message.sender_address
        identity_id = self.wallet_identity_ids.get(account, "")
        if not identity_id:
            _expected("x_identity_not_bound")

        challenge = self.pending_binding_challenges.get(account, "")
        purpose = self.pending_challenge_purposes.get(account, "")
        if not challenge or purpose != CHALLENGE_PURPOSE_REVERIFY:
            _expected("x_reverification_challenge_missing")
        now = _now_unix()
        if now > int(self.pending_binding_expires_at.get(account, u256(0))):
            _expected("x_reverification_challenge_expired")

        verified = self._run_x_proof_consensus(proof_url, challenge)
        farcaster_verified = self._run_farcaster_cast_consensus(
            farcaster_proof_url, challenge
        )
        if verified["identity_id"] != identity_id:
            _expected("x_identity_changed")

        farcaster_fid = farcaster_verified["fid"]
        previous_farcaster_fid = self.wallet_farcaster_fids.get(
            account, ""
        )
        if (
            previous_farcaster_fid
            and farcaster_fid != previous_farcaster_fid
        ):
            _expected("farcaster_identity_changed")
        farcaster_existing_wallet = self.farcaster_fid_wallet_addresses.get(
            farcaster_fid, ""
        )
        if (
            farcaster_existing_wallet
            and farcaster_existing_wallet != _address_key(account)
        ):
            _expected("farcaster_identity_already_bound")

        handle = verified["handle"]
        self.identity_handles[account] = handle
        self.identity_proof_urls[account] = (
            f"https://x.com/{handle}/status/{verified['tweet_id']}"
        )
        farcaster_handle = farcaster_verified["handle"]
        self.wallet_farcaster_fids[account] = farcaster_fid
        self.farcaster_fid_wallet_addresses[farcaster_fid] = (
            _address_key(account)
        )
        self.farcaster_handles[account] = farcaster_handle
        self.farcaster_proof_urls[account] = (
            f"{FARCASTER_SITE_ROOT}{farcaster_handle}/"
            f"{farcaster_verified['cast_hash']}"
        )
        self.identity_challenges[account] = challenge
        self.identity_verified_at[account] = u256(now)
        self.identity_verified_until[account] = u256(
            now + X_VERIFICATION_VALIDITY_SECONDS
        )
        self._clear_x_challenge(account)

    def _total_reputation(self, account: Address) -> int:
        return int(self.reputation_balances.get(account, u256(0))) + int(
            self.reputation_at_risk.get(account, u256(0))
        )

    def _clear_recovery(self, account: Address) -> None:
        self.recovery_active[account] = False
        self.recovery_next_at[account] = u256(0)

    def _maybe_start_recovery(self, account: Address, now: int) -> None:
        if self.recovery_active.get(account, False):
            return
        if int(self.user_open_prediction_counts.get(account, u256(0))) != 0:
            return
        if int(self.reputation_at_risk.get(account, u256(0))) != 0:
            return
        if self._total_reputation(account) >= RECOVERY_TRIGGER_BELOW:
            return
        self.recovery_active[account] = True
        self.recovery_next_at[account] = u256(now + RECOVERY_COOLDOWN_SECONDS)

    def _recoverable_reputation(self, account: Address, now: int) -> int:
        if not self.recovery_active.get(account, False):
            return 0
        next_at = int(self.recovery_next_at.get(account, u256(0)))
        if next_at == 0 or now < next_at:
            return 0
        total = self._total_reputation(account)
        if total >= RECOVERY_TARGET:
            return 0
        steps = 1 + ((now - next_at) // RECOVERY_STEP_SECONDS)
        return min(steps, RECOVERY_TARGET - total)

    @gl.public.write
    def start_recovery(self) -> None:
        account = gl.message.sender_address
        if not self.registered.get(account, False):
            _expected("user_not_registered")
        self._require_identity_active(account)
        if self.recovery_active.get(account, False):
            _expected("recovery_already_active")
        if int(self.user_open_prediction_counts.get(account, u256(0))) != 0:
            _expected("recovery_requires_no_open_predictions")
        if int(self.reputation_at_risk.get(account, u256(0))) != 0:
            _expected("recovery_requires_no_reputation_at_risk")
        if self._total_reputation(account) >= RECOVERY_TRIGGER_BELOW:
            _expected("recovery_not_eligible")

        now = _now_unix()
        self.recovery_active[account] = True
        self.recovery_next_at[account] = u256(
            now + RECOVERY_COOLDOWN_SECONDS
        )

    @gl.public.write
    def claim_recovery(self) -> None:
        account = gl.message.sender_address
        if not self.registered.get(account, False):
            _expected("user_not_registered")
        self._require_identity_active(account)
        if not self.recovery_active.get(account, False):
            _expected("recovery_not_active")
        if int(self.user_open_prediction_counts.get(account, u256(0))) != 0:
            _expected("recovery_requires_no_open_predictions")
        if int(self.reputation_at_risk.get(account, u256(0))) != 0:
            _expected("recovery_requires_no_reputation_at_risk")

        now = _now_unix()
        amount = self._recoverable_reputation(account, now)
        if amount < 1:
            _expected("recovery_not_ready")

        balance = int(self.reputation_balances.get(account, u256(0)))
        self.reputation_balances[account] = u256(balance + amount)
        self.user_recovered_reputation[account] = u256(
            int(self.user_recovered_reputation.get(account, u256(0))) + amount
        )
        self.total_reputation_recovered = u256(
            int(self.total_reputation_recovered) + amount
        )

        if self._total_reputation(account) >= RECOVERY_TARGET:
            self._clear_recovery(account)
        else:
            previous_next = int(
                self.recovery_next_at.get(account, u256(0))
            )
            self.recovery_next_at[account] = u256(
                previous_next + (amount * RECOVERY_STEP_SECONDS)
            )

    def _run_polymarket_consensus(
        self, market_id: str, mode: str, now: int
    ) -> dict[str, Any]:
        url = f"{POLYMARKET_API_ROOT}{market_id}"

        def leader_fn() -> str:
            try:
                response = gl.nondet.web.get(
                    url,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "CREDREP-Market-Verifier/1.0",
                    },
                )
            except Exception:
                _transient("polymarket_fetch_failed")
            if response.status == 429 or response.status >= 500:
                _transient(f"polymarket_http_{response.status}")
            if response.status != 200 or response.body is None:
                _external(f"polymarket_http_{response.status}")
            try:
                payload = json.loads(
                    response.body[:MAX_MARKET_BODY_BYTES].decode(
                        "utf-8", errors="strict"
                    )
                )
            except (ValueError, UnicodeDecodeError, TypeError):
                _external("invalid_polymarket_response")
            if mode == "ACTIVE":
                return _canonical_active_market(payload, market_id, now)
            if mode == "RESOLVE":
                return _canonical_market_resolution(payload, market_id)
            _expected("invalid_market_consensus_mode")

        def validator_fn(leaders_res: gl.vm.Result[str]) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                if not isinstance(leaders_res, gl.vm.UserError):
                    return False
                try:
                    leader_fn()
                    return False
                except gl.vm.UserError as validator_error:
                    leader_message = leaders_res.message
                    validator_message = validator_error.message
                    if leader_message.startswith(ERROR_TRANSIENT):
                        return validator_message.startswith(ERROR_TRANSIENT)
                    if leader_message.startswith(ERROR_EXTERNAL):
                        return validator_message == leader_message
                    if leader_message.startswith(ERROR_EXPECTED):
                        return validator_message == leader_message
                    return False
                except Exception:
                    return False
            try:
                return str(leaders_res.calldata) == leader_fn()
            except Exception:
                return False

        result = str(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))
        try:
            parsed = json.loads(result)
        except (ValueError, TypeError):
            _transient("polymarket_consensus_result_unreadable")
        if not isinstance(parsed, dict):
            _transient("polymarket_consensus_result_unreadable")
        return cast(dict[str, Any], parsed)

    def _run_ctf_consensus(self, condition_id: str) -> dict[str, Any]:
        normalized_condition_id = _condition_id(condition_id)
        condition_hex = normalized_condition_id[2:]
        zero_index = "0" * 64
        one_index = "0" * 63 + "1"
        calls = [
            {
                "id": 1,
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "data": "0x"
                        + PAYOUT_DENOMINATOR_SELECTOR
                        + condition_hex,
                        "to": POLYMARKET_CTF_ADDRESS,
                    },
                    "latest",
                ],
            },
            {
                "id": 2,
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "data": "0x"
                        + PAYOUT_NUMERATOR_SELECTOR
                        + condition_hex
                        + zero_index,
                        "to": POLYMARKET_CTF_ADDRESS,
                    },
                    "latest",
                ],
            },
            {
                "id": 3,
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "data": "0x"
                        + PAYOUT_NUMERATOR_SELECTOR
                        + condition_hex
                        + one_index,
                        "to": POLYMARKET_CTF_ADDRESS,
                    },
                    "latest",
                ],
            },
        ]
        body = _canonical_json(calls).encode("utf-8")

        def leader_fn() -> str:
            results: list[str] = []
            for url in (POLYGON_RPC_PRIMARY, POLYGON_RPC_SECONDARY):
                try:
                    response = gl.nondet.web.post(
                        url,
                        body=body,
                        headers={
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "User-Agent": "CREDREP-Settlement-Verifier/1.0",
                        },
                    )
                except Exception:
                    _transient("polygon_rpc_fetch_failed")
                if response.status == 429 or response.status >= 500:
                    _transient(f"polygon_rpc_http_{response.status}")
                if response.status != 200 or response.body is None:
                    _external(f"polygon_rpc_http_{response.status}")
                try:
                    payload = json.loads(
                        response.body[:MAX_MARKET_BODY_BYTES].decode(
                            "utf-8", errors="strict"
                        )
                    )
                except (ValueError, UnicodeDecodeError, TypeError):
                    _external("invalid_polygon_rpc_response")
                results.append(
                    _canonical_ctf_resolution(
                        payload, normalized_condition_id
                    )
                )
            if results[0] != results[1]:
                _transient("polygon_rpc_provider_disagreement")
            return results[0]

        def validator_fn(leaders_res: gl.vm.Result[str]) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                if not isinstance(leaders_res, gl.vm.UserError):
                    return False
                try:
                    leader_fn()
                    return False
                except gl.vm.UserError as validator_error:
                    leader_message = leaders_res.message
                    validator_message = validator_error.message
                    if leader_message.startswith(ERROR_TRANSIENT):
                        return validator_message.startswith(ERROR_TRANSIENT)
                    if leader_message.startswith(ERROR_EXTERNAL):
                        return validator_message == leader_message
                    if leader_message.startswith(ERROR_EXPECTED):
                        return validator_message == leader_message
                    return False
                except Exception:
                    return False
            try:
                return str(leaders_res.calldata) == leader_fn()
            except Exception:
                return False

        result = str(gl.vm.run_nondet_unsafe(leader_fn, validator_fn))
        try:
            parsed = json.loads(result)
        except (ValueError, TypeError):
            _transient("ctf_consensus_result_unreadable")
        if not isinstance(parsed, dict):
            _transient("ctf_consensus_result_unreadable")
        if str(parsed.get("condition_id", "")) != normalized_condition_id:
            _transient("ctf_condition_id_mismatch")
        return cast(dict[str, Any], parsed)

    def _store_or_verify_market(
        self, market_id: str, market: dict[str, Any]
    ) -> None:
        question = str(market["question"])
        description = str(market["description"])
        slug = str(market["slug"])
        source_url = str(market["source_url"])
        end_time = int(market["end_time"])
        condition_id = _condition_id(market["condition_id"])
        if self.market_exists.get(market_id, False):
            if (
                self.market_questions[market_id] != question
                or self.market_descriptions[market_id] != description
                or self.market_slugs[market_id] != slug
                or self.market_source_urls[market_id] != source_url
                or int(self.market_end_times[market_id]) != end_time
            ):
                _external("polymarket_market_metadata_changed")
            existing_condition_id = self.market_condition_ids.get(
                market_id, ""
            )
            if existing_condition_id and existing_condition_id != condition_id:
                _external("polymarket_condition_id_changed")
            if not existing_condition_id:
                self.market_condition_ids[market_id] = condition_id
            return

        self.market_exists[market_id] = True
        self.market_questions[market_id] = question
        self.market_descriptions[market_id] = description
        self.market_slugs[market_id] = slug
        self.market_source_urls[market_id] = source_url
        self.market_end_times[market_id] = u256(end_time)
        self.market_condition_ids[market_id] = condition_id
        self.market_statuses[market_id] = MARKET_OPEN
        self.market_synced_at[market_id] = str(gl.message_raw["datetime"])
        self.market_ids.append(market_id)
        self.market_count = u256(int(self.market_count) + 1)

    @gl.public.write
    def sync_market(self, market_id: str) -> None:
        normalized_id = _market_id(market_id)
        now = _now_unix()
        market = self._run_polymarket_consensus(normalized_id, "ACTIVE", now)
        self._store_or_verify_market(normalized_id, market)

    @gl.public.write
    def make_prediction(
        self,
        market_id: str,
        prediction: str,
        confidence_bps: u256,
        stake: u256,
    ) -> None:
        account = gl.message.sender_address
        if not self.registered.get(account, False):
            _expected("user_not_registered")
        self._require_identity_active(account)

        normalized_id = _market_id(market_id)
        selected = _prediction(prediction)
        confidence = int(confidence_bps)
        if confidence < MIN_CONFIDENCE_BPS or confidence > MAX_CONFIDENCE_BPS:
            _expected("confidence_out_of_range")

        key = _position_key(account, normalized_id)
        if self.position_exists.get(key, False):
            _expected("prediction_already_exists")

        now = _now_unix()
        market = self._run_polymarket_consensus(normalized_id, "ACTIVE", now)
        self._store_or_verify_market(normalized_id, market)
        if self.market_statuses[normalized_id] != MARKET_OPEN:
            _expected("market_not_open")

        wager = int(stake)
        balance = int(self.reputation_balances.get(account, u256(0)))
        if wager < 1 or wager > balance:
            _expected("insufficient_reputation")
        allowed = max(1, (balance * int(self.max_stake_bps)) // 10_000)
        if wager > allowed:
            _expected("stake_above_limit")

        self._clear_recovery(account)
        at_risk = int(self.reputation_at_risk.get(account, u256(0)))
        current_count = int(
            self.user_prediction_counts.get(account, u256(0))
        )
        self.reputation_balances[account] = u256(balance - wager)
        self.reputation_at_risk[account] = u256(at_risk + wager)
        self.user_prediction_counts[account] = u256(current_count + 1)
        self.user_open_prediction_counts[account] = u256(
            int(self.user_open_prediction_counts.get(account, u256(0))) + 1
        )

        self.position_exists[key] = True
        self.position_predictions[key] = selected
        self.position_confidence_bps[key] = u256(confidence)
        self.position_stakes[key] = stake
        self.position_statuses[key] = POSITION_OPEN
        self.position_created_at[key] = str(gl.message_raw["datetime"])
        self.user_position_ids[
            f"{_address_key(account)}|{current_count}"
        ] = normalized_id
        self.market_prediction_counts[normalized_id] = u256(
            int(self.market_prediction_counts.get(normalized_id, u256(0))) + 1
        )
        self.market_total_staked[normalized_id] = u256(
            int(self.market_total_staked.get(normalized_id, u256(0))) + wager
        )
        self.prediction_count = u256(int(self.prediction_count) + 1)

    @gl.public.write
    def resolve_market(self, market_id: str) -> None:
        normalized_id = _market_id(market_id)
        if not self.market_exists.get(normalized_id, False):
            _expected("market_not_found")
        if self.market_statuses[normalized_id] != MARKET_OPEN:
            _expected("market_not_open")
        now = _now_unix()
        if now < int(self.market_end_times[normalized_id]):
            _expected("market_resolution_window_not_open")

        resolution = self._run_polymarket_consensus(
            normalized_id, "RESOLVE", now
        )
        gamma_condition_id = _condition_id(resolution.get("condition_id", ""))
        stored_condition_id = self.market_condition_ids.get(normalized_id, "")
        if stored_condition_id and stored_condition_id != gamma_condition_id:
            _external("polymarket_condition_id_changed")
        if not stored_condition_id:
            self.market_condition_ids[normalized_id] = gamma_condition_id
        ctf_resolution = self._run_ctf_consensus(gamma_condition_id)
        outcome = str(resolution.get("outcome", "")).upper()
        if outcome not in (PREDICTION_YES, PREDICTION_NO, OUTCOME_VOID):
            _transient("polymarket_consensus_result_unreadable")
        ctf_outcome = str(ctf_resolution.get("outcome", "")).upper()
        if ctf_outcome != outcome:
            _transient("polymarket_ctf_outcome_disagreement")
        self.market_outcomes[normalized_id] = outcome
        self.market_statuses[normalized_id] = (
            MARKET_VOID if outcome == OUTCOME_VOID else MARKET_RESOLVED
        )
        self.market_resolved_at[normalized_id] = str(
            gl.message_raw["datetime"]
        )

    @gl.public.write
    def void_stale_market(self, market_id: str) -> None:
        normalized_id = _market_id(market_id)
        if not self.market_exists.get(normalized_id, False):
            _expected("market_not_found")
        if self.market_statuses[normalized_id] != MARKET_OPEN:
            _expected("market_not_open")
        now = _now_unix()
        void_after = (
            int(self.market_end_times[normalized_id])
            + MARKET_VOID_TIMEOUT_SECONDS
        )
        if now < void_after:
            _expected("market_void_window_not_open")

        self.market_outcomes[normalized_id] = OUTCOME_VOID
        self.market_statuses[normalized_id] = MARKET_VOID
        self.market_resolved_at[normalized_id] = str(
            gl.message_raw["datetime"]
        )

    @gl.public.write
    def schedule_upgrade(self, code_hash: str) -> None:
        if gl.message.sender_address != self.upgrade_authority:
            _expected("only_upgrade_authority")
        normalized_hash = _normalize_upgrade_hash(code_hash)
        now = _now_unix()
        self.pending_upgrade_code_hash = normalized_hash
        self.pending_upgrade_scheduled_at = u256(now)
        self.pending_upgrade_execute_after = u256(
            now + UPGRADE_DELAY_SECONDS
        )

    @gl.public.write
    def cancel_upgrade(self) -> None:
        if gl.message.sender_address != self.upgrade_authority:
            _expected("only_upgrade_authority")
        if not self.pending_upgrade_code_hash:
            _expected("upgrade_not_scheduled")
        self.pending_upgrade_code_hash = ""
        self.pending_upgrade_scheduled_at = u256(0)
        self.pending_upgrade_execute_after = u256(0)

    @gl.public.write
    def execute_upgrade(self, new_code: bytes) -> None:
        if gl.message.sender_address != self.upgrade_authority:
            _expected("only_upgrade_authority")
        scheduled_hash = self.pending_upgrade_code_hash
        if not scheduled_hash:
            _expected("upgrade_not_scheduled")
        if _now_unix() < int(self.pending_upgrade_execute_after):
            _expected("upgrade_delay_active")
        if len(new_code) == 0:
            _expected("upgrade_code_required")
        actual_hash = Keccak256(new_code).hexdigest()
        if actual_hash != scheduled_hash:
            _expected("upgrade_code_hash_mismatch")
        self.pending_upgrade_code_hash = ""
        self.pending_upgrade_scheduled_at = u256(0)
        self.pending_upgrade_execute_after = u256(0)
        root = gl.storage.Root.get()
        code = root.code.get()
        code.truncate()
        code.extend(new_code)

    @gl.public.write
    def settle_prediction(self, market_id: str) -> None:
        account = gl.message.sender_address
        normalized_id = _market_id(market_id)
        if not self.market_exists.get(normalized_id, False):
            _expected("market_not_found")
        if self.market_statuses[normalized_id] == MARKET_OPEN:
            _expected("market_not_resolved")

        key = _position_key(account, normalized_id)
        if not self.position_exists.get(key, False):
            _expected("prediction_not_found")
        if self.position_statuses[key] != POSITION_OPEN:
            _expected("prediction_already_settled")

        wager = int(self.position_stakes[key])
        balance = int(self.reputation_balances.get(account, u256(0)))
        at_risk = int(self.reputation_at_risk.get(account, u256(0)))
        if at_risk < wager:
            _expected("invalid_at_risk_balance")
        open_predictions = int(
            self.user_open_prediction_counts.get(account, u256(0))
        )
        if open_predictions < 1:
            _expected("invalid_open_prediction_count")
        self.reputation_at_risk[account] = u256(at_risk - wager)
        self.user_open_prediction_counts[account] = u256(
            open_predictions - 1
        )

        outcome = self.market_outcomes[normalized_id]
        if outcome == OUTCOME_VOID:
            self.reputation_balances[account] = u256(balance + wager)
            self.position_statuses[key] = POSITION_VOID
            self.user_void_counts[account] = u256(
                int(self.user_void_counts.get(account, u256(0))) + 1
            )
        else:
            selected = self.position_predictions[key]
            correct = selected == outcome
            if correct:
                self.reputation_balances[account] = u256(
                    balance + (2 * wager)
                )
                self.position_statuses[key] = POSITION_WON
                self.total_bonus_minted = u256(
                    int(self.total_bonus_minted) + wager
                )
                self.user_correct_counts[account] = u256(
                    int(self.user_correct_counts.get(account, u256(0))) + 1
                )
            else:
                self.position_statuses[key] = POSITION_LOST
                self.total_reputation_burned = u256(
                    int(self.total_reputation_burned) + wager
                )

            confidence = int(self.position_confidence_bps[key])
            probability_yes = (
                confidence
                if selected == PREDICTION_YES
                else 10_000 - confidence
            )
            actual_yes = 10_000 if outcome == PREDICTION_YES else 0
            error = abs(probability_yes - actual_yes)
            score = 10_000 - ((error * error) // 10_000)
            self.position_scores_bps[key] = u256(score)
            self.user_score_sums[account] = u256(
                int(self.user_score_sums.get(account, u256(0))) + score
            )
            self.user_resolved_counts[account] = u256(
                int(self.user_resolved_counts.get(account, u256(0))) + 1
            )

        self.position_settled_at[key] = str(gl.message_raw["datetime"])
        self._maybe_start_recovery(account, _now_unix())

    @gl.public.view
    def get_binding_challenge(self, account: Address) -> dict[str, Any]:
        challenge = self.pending_binding_challenges.get(account, "")
        expires_at = int(
            self.pending_binding_expires_at.get(account, u256(0))
        )
        now = _now_unix()
        return {
            "challenge": challenge,
            "expires_at": expires_at,
            "active": bool(challenge) and now <= expires_at,
            "attempt": int(self.binding_attempts.get(account, u256(0))),
            "purpose": self.pending_challenge_purposes.get(account, ""),
        }

    @gl.public.view
    def get_identity_status(self, account: Address) -> dict[str, Any]:
        now = _now_unix()
        identity_id = self.wallet_identity_ids.get(account, "")
        farcaster_fid = self.wallet_farcaster_fids.get(account, "")
        verified_at = int(self.identity_verified_at.get(account, u256(0)))
        verified_until = int(
            self.identity_verified_until.get(account, u256(0))
        )
        status = self._identity_status_value(account, now)
        pending_challenge = self.pending_binding_challenges.get(account, "")
        pending_expires_at = int(
            self.pending_binding_expires_at.get(account, u256(0))
        )
        pending_purpose = self.pending_challenge_purposes.get(account, "")
        return {
            "bound": bool(identity_id),
            "dual_source_bound": bool(identity_id) and bool(farcaster_fid),
            "status": status,
            "handle": self.identity_handles.get(account, ""),
            "identity_id": identity_id,
            "proof_url": self.identity_proof_urls.get(account, ""),
            "farcaster_fid": farcaster_fid,
            "farcaster_handle": self.farcaster_handles.get(account, ""),
            "farcaster_proof_url": self.farcaster_proof_urls.get(account, ""),
            "challenge": self.identity_challenges.get(account, ""),
            "verified_at": verified_at,
            "verified_until": verified_until,
            "grace_until": (
                verified_until + X_VERIFICATION_GRACE_SECONDS
                if verified_until > 0
                else 0
            ),
            "reverification_due": bool(identity_id)
            and (
                not farcaster_fid
                or now + X_REVERIFICATION_WINDOW_SECONDS >= verified_until
            ),
            "reverification_pending": bool(pending_challenge)
            and now <= pending_expires_at
            and pending_purpose == CHALLENGE_PURPOSE_REVERIFY,
            "can_predict": status in (IDENTITY_VERIFIED, IDENTITY_GRACE),
        }

    @gl.public.view
    def get_market(self, market_id: str) -> dict[str, Any]:
        normalized_id = _market_id(market_id)
        if not self.market_exists.get(normalized_id, False):
            _expected("market_not_found")
        return {
            "id": normalized_id,
            "question": self.market_questions[normalized_id],
            "description": self.market_descriptions[normalized_id],
            "slug": self.market_slugs[normalized_id],
            "source_url": self.market_source_urls[normalized_id],
            "condition_id": self.market_condition_ids.get(normalized_id, ""),
            "settlement_source": "Polymarket Gamma + Polygon CTF",
            "end_time_unix": int(self.market_end_times[normalized_id]),
            "void_after_unix": int(self.market_end_times[normalized_id])
            + MARKET_VOID_TIMEOUT_SECONDS,
            "status": self.market_statuses[normalized_id],
            "outcome": self.market_outcomes.get(normalized_id, ""),
            "prediction_count": int(
                self.market_prediction_counts.get(normalized_id, u256(0))
            ),
            "total_reputation_staked": int(
                self.market_total_staked.get(normalized_id, u256(0))
            ),
            "synced_at": self.market_synced_at[normalized_id],
            "resolved_at": self.market_resolved_at.get(normalized_id, ""),
        }

    @gl.public.view
    def get_market_ids(self, offset: u256, limit: u256) -> list[str]:
        start = int(offset)
        size = min(int(limit), 100)
        result: list[str] = []
        end = min(start + size, len(self.market_ids))
        for index in range(start, end):
            result.append(self.market_ids[index])
        return result

    @gl.public.view
    def get_position(
        self, account: Address, market_id: str
    ) -> dict[str, Any]:
        normalized_id = _market_id(market_id)
        key = _position_key(account, normalized_id)
        if not self.position_exists.get(key, False):
            return {"exists": False, "market_id": normalized_id}
        return {
            "exists": True,
            "market_id": normalized_id,
            "prediction": self.position_predictions[key],
            "confidence_bps": int(self.position_confidence_bps[key]),
            "stake": int(self.position_stakes[key]),
            "status": self.position_statuses[key],
            "score_bps": int(
                self.position_scores_bps.get(key, u256(0))
            ),
            "created_at": self.position_created_at[key],
            "settled_at": self.position_settled_at.get(key, ""),
        }

    @gl.public.view
    def get_user_position_ids(
        self, account: Address, offset: u256, limit: u256
    ) -> list[str]:
        start = int(offset)
        size = min(int(limit), 100)
        total = int(self.user_prediction_counts.get(account, u256(0)))
        end = min(start + size, total)
        result: list[str] = []
        account_key = _address_key(account)
        for index in range(start, end):
            result.append(self.user_position_ids[f"{account_key}|{index}"])
        return result

    @gl.public.view
    def get_user_profile(self, account: Address) -> dict[str, Any]:
        available = int(self.reputation_balances.get(account, u256(0)))
        at_risk = int(self.reputation_at_risk.get(account, u256(0)))
        resolved = int(self.user_resolved_counts.get(account, u256(0)))
        correct = int(self.user_correct_counts.get(account, u256(0)))
        now = _now_unix()
        identity_id = self.wallet_identity_ids.get(account, "")
        farcaster_fid = self.wallet_farcaster_fids.get(account, "")
        identity_status = self._identity_status_value(account, now)
        recovery_is_active = self.recovery_active.get(account, False)
        return {
            "registered": self.registered.get(account, False),
            "reputation": available + at_risk,
            "available_reputation": available,
            "reputation_at_risk": at_risk,
            "predictions_made": int(
                self.user_prediction_counts.get(account, u256(0))
            ),
            "open_predictions": int(
                self.user_open_prediction_counts.get(account, u256(0))
            ),
            "resolved_predictions": resolved,
            "correct_predictions": correct,
            "void_predictions": int(
                self.user_void_counts.get(account, u256(0))
            ),
            "accuracy_bps": (correct * 10_000) // resolved if resolved > 0 else 0,
            "prediction_score_bps": (
                int(self.user_score_sums.get(account, u256(0))) // resolved
                if resolved > 0
                else 0
            ),
            "x_identity_bound": bool(identity_id),
            "x_identity_id": identity_id,
            "x_handle": self.identity_handles.get(account, ""),
            "x_identity_status": identity_status,
            "x_verified_at": int(
                self.identity_verified_at.get(account, u256(0))
            ),
            "x_verified_until": int(
                self.identity_verified_until.get(account, u256(0))
            ),
            "farcaster_identity_bound": bool(farcaster_fid),
            "farcaster_fid": farcaster_fid,
            "farcaster_handle": self.farcaster_handles.get(account, ""),
            "dual_source_identity_bound": bool(identity_id)
            and bool(farcaster_fid),
            "recovery_active": recovery_is_active,
            "recovery_next_at": int(
                self.recovery_next_at.get(account, u256(0))
            ),
            "recoverable_reputation": self._recoverable_reputation(
                account, now
            ),
            "recovered_reputation": int(
                self.user_recovered_reputation.get(account, u256(0))
            ),
        }

    @gl.public.view
    def get_protocol_stats(self) -> dict[str, int]:
        return {
            "users": int(self.user_count),
            "markets": int(self.market_count),
            "predictions": int(self.prediction_count),
            "starting_reputation": int(self.starting_reputation),
            "max_stake_bps": int(self.max_stake_bps),
            "total_bonus_minted": int(self.total_bonus_minted),
            "total_reputation_burned": int(self.total_reputation_burned),
            "total_reputation_recovered": int(
                self.total_reputation_recovered
            ),
            "recovery_trigger_below": RECOVERY_TRIGGER_BELOW,
            "recovery_target": RECOVERY_TARGET,
            "x_verification_validity_seconds": X_VERIFICATION_VALIDITY_SECONDS,
            "x_verification_grace_seconds": X_VERIFICATION_GRACE_SECONDS,
            "x_reverification_window_seconds": X_REVERIFICATION_WINDOW_SECONDS,
            "market_void_timeout_seconds": MARKET_VOID_TIMEOUT_SECONDS,
            "upgrade_delay_seconds": UPGRADE_DELAY_SECONDS,
        }

    @gl.public.view
    def get_governance(self) -> dict[str, Any]:
        pending_hash = self.pending_upgrade_code_hash
        return {
            "upgradeable": True,
            "upgrade_authority": str(self.upgrade_authority),
            "upgrade_delay_seconds": UPGRADE_DELAY_SECONDS,
            "upgrade_pending": bool(pending_hash),
            "pending_upgrade_code_hash": pending_hash,
            "pending_upgrade_scheduled_at": int(
                self.pending_upgrade_scheduled_at
            ),
            "pending_upgrade_execute_after": int(
                self.pending_upgrade_execute_after
            ),
            "market_void_timeout_seconds": MARKET_VOID_TIMEOUT_SECONDS,
        }
