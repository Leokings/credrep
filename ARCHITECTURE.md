# CREDREP architecture

## Product boundary

Polymarket supplies questions and final outcomes. CREDREP does not copy its
money, shares, liquidity, or odds. Every position belongs to one wallet and
risks only that wallet's REP.

The website fetches active Yes/No questions from Polymarket's Gamma API and
caches them in Neon Postgres for discovery. The cache is not authoritative. On
the first position, GenLayer validators independently fetch the market by ID
and freeze its question, rules, slug, deadline, and Polygon condition ID
onchain. At resolution, Gamma's final result must match the payout vector in
Polymarket's Polygon Conditional Tokens contract. Validators read that state
through two independent Polygon RPC providers and reject settlement unless
both providers, Gamma, and GenLayer consensus agree. The feed refreshes while
the site is open, and expired entries are removed from the discovery cache.

## Identity

One stable X account ID and one stable Farcaster FID bind to one wallet. The
user posts the same contract-generated challenge on both networks. Validators
verify the exact X post, the Farcaster cast's stable FID and exact content, and
the Farcaster username-to-FID record. Fresh posts are required every 30 days,
with a 7-day grace period. A stale identity keeps its history but cannot predict
or collect recovery until the same two accounts are reverified.

## REP settlement

For a 1 REP position opened from a 100 REP balance:

| Outcome | Returned | Final REP |
| --- | ---: | ---: |
| Correct | 2 REP | 101 |
| Wrong | 0 REP | 99 |
| Void | 1 REP | 100 |

Stake moves from available REP to at-risk REP while open. Settlement is lazy:
the market resolves once, then each owner settles their own position.

If the source never publishes a final result, any wallet can deterministically
void the market 30 days after its deadline. Settlement then refunds each stake
without changing accuracy or Prediction Score.

## Prediction Score

Confidence is between 50% and 95%. For each definitive outcome, the contract
converts the forecast to a probability of YES and computes:

```text
score = 1 - (predicted_probability - actual_outcome)^2
```

The displayed Prediction Score is the mean of those scores, expressed as a
percentage. Voids do not affect it. Accuracy remains a separate metric.

## Recovery

Below 20 total REP, with no open position or REP at risk, recovery can begin
after a 7-day cooldown. One REP then accrues per day up to exactly 100. Only a
correct prediction can take REP above 100.

## Ownership

GenLayer owns dual-source identity binding, market verification, REP
accounting, positions, resolution, calibration scoring, and recovery. Neon
Postgres owns only the external feed cache, public chain read model, short-lived
index challenges, and rate-limit counters. The browser wallet signs every
action that changes a user's state.

The public read model no longer trusts hosting-provider identity headers. A
registered wallet signs a five-minute, origin-bound authorization challenge.
The server verifies and consumes it once, then issues a signed, HTTP-only,
same-site session scoped to `/api/index` for seven days. The message explicitly
cannot authorize a transaction or spend REP. Index and challenge endpoints are
rate-limited separately by wallet and keyed network hash.

The Bradbury contract registers the dedicated CREDREP deployer as its upgrade
authority. The authority can schedule a code hash, but execution is blocked for
seven days. The pending hash and execution time are public, and the authority
can cancel during the delay. Future code upgrades must preserve the append-only
storage layout, and the deployed code and transactions remain inspectable.

## Transaction lifecycle

The browser requires Bradbury before enabling a write. Once a wallet submits a
transaction, CREDREP stores its hash on that device, blocks duplicate writes,
and restores the pending status after a refresh. The user can recheck it or open
the Bradbury Explorer until the transaction reaches a terminal state.

## Operations

`GET /api/health` checks Postgres connectivity and confirms that a contract
address is configured. Feed/index failures emit structured route, request,
status, and duration logs without recording signatures or secrets. Vercel Web
Analytics and Speed Insights cover aggregate traffic and web performance.
Continuous integration runs the web build, lint, rendered-route tests,
production dependency audit, GenVM lint, and direct contract tests.
