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
MAX_MARKET_BODY_BYTES = 200_000
MAX_MARKET_QUESTION_LENGTH = 500
MAX_MARKET_DESCRIPTION_LENGTH = 2_000
MIN_CONFIDENCE_BPS = 5_000
MAX_CONFIDENCE_BPS = 9_500


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


def _market_id(raw: Any) -> str:
    value = str(raw).strip()
    if len(value) < 1 or len(value) > 32 or not value.isdigit():
        _expected("invalid_market_id")
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
    return _canonical_json(
        {
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
    return _canonical_json({"id": expected_id, "outcome": outcome})


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
    def verify_x_binding(self, proof_url: str) -> None:
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
        identity_id = verified["identity_id"]
        existing_wallet = self.identity_wallet_addresses.get(identity_id, "")
        if existing_wallet:
            _expected("x_identity_already_bound")

        handle = verified["handle"]
        canonical_proof = (
            f"https://x.com/{handle}/status/{verified['tweet_id']}"
        )
        self.wallet_identity_ids[account] = identity_id
        self.identity_wallet_addresses[identity_id] = _address_key(account)
        self.identity_handles[account] = handle
        self.identity_proof_urls[account] = canonical_proof
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
        if now + X_REVERIFICATION_WINDOW_SECONDS < verified_until:
            _expected("x_reverification_not_due")
        self._issue_x_challenge(account, CHALLENGE_PURPOSE_REVERIFY)

    @gl.public.write
    def verify_x_reverification(self, proof_url: str) -> None:
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
        if verified["identity_id"] != identity_id:
            _expected("x_identity_changed")

        handle = verified["handle"]
        self.identity_handles[account] = handle
        self.identity_proof_urls[account] = (
            f"https://x.com/{handle}/status/{verified['tweet_id']}"
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

    def _store_or_verify_market(
        self, market_id: str, market: dict[str, Any]
    ) -> None:
        question = str(market["question"])
        description = str(market["description"])
        slug = str(market["slug"])
        source_url = str(market["source_url"])
        end_time = int(market["end_time"])
        if self.market_exists.get(market_id, False):
            if (
                self.market_questions[market_id] != question
                or self.market_descriptions[market_id] != description
                or self.market_slugs[market_id] != slug
                or self.market_source_urls[market_id] != source_url
                or int(self.market_end_times[market_id]) != end_time
            ):
                _external("polymarket_market_metadata_changed")
            return

        self.market_exists[market_id] = True
        self.market_questions[market_id] = question
        self.market_descriptions[market_id] = description
        self.market_slugs[market_id] = slug
        self.market_source_urls[market_id] = source_url
        self.market_end_times[market_id] = u256(end_time)
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
        outcome = str(resolution.get("outcome", "")).upper()
        if outcome not in (PREDICTION_YES, PREDICTION_NO, OUTCOME_VOID):
            _transient("polymarket_consensus_result_unreadable")
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
    def upgrade(self, new_code: bytes) -> None:
        if gl.message.sender_address != self.upgrade_authority:
            _expected("only_upgrade_authority")
        if len(new_code) == 0:
            _expected("upgrade_code_required")
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
            "status": status,
            "handle": self.identity_handles.get(account, ""),
            "identity_id": identity_id,
            "proof_url": self.identity_proof_urls.get(account, ""),
            "challenge": self.identity_challenges.get(account, ""),
            "verified_at": verified_at,
            "verified_until": verified_until,
            "grace_until": (
                verified_until + X_VERIFICATION_GRACE_SECONDS
                if verified_until > 0
                else 0
            ),
            "reverification_due": bool(identity_id)
            and now + X_REVERIFICATION_WINDOW_SECONDS >= verified_until,
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
        }

    @gl.public.view
    def get_governance(self) -> dict[str, Any]:
        return {
            "upgradeable": True,
            "upgrade_authority": str(self.upgrade_authority),
            "market_void_timeout_seconds": MARKET_VOID_TIMEOUT_SECONDS,
        }
