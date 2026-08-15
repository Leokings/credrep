# CREDREP architecture

## Product boundary

Polymarket supplies questions and final outcomes. CREDREP does not copy its
money, shares, liquidity, or odds. Every position belongs to one wallet and
risks only that wallet's REP.

The website fetches active Yes/No questions from Polymarket's Gamma API and
caches them in Neon Postgres for discovery. The cache is not authoritative. On the first
position, GenLayer validators independently fetch the market by ID and freeze
its question, rules, slug, and deadline onchain. Validators fetch it again for
resolution. The feed refreshes while the site is open, and expired feed entries
are removed from the discovery cache.

## Identity

One stable X account ID binds to one wallet. A fresh public challenge post is
required every 30 days, with a 7-day grace period. A stale identity keeps its
history but cannot predict or collect recovery until the same X account is
reverified.

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

GenLayer owns X binding, market verification, REP accounting, positions,
resolution, calibration scoring, and recovery. Neon Postgres owns only the
external feed cache, public chain read model, short-lived index challenges, and
rate-limit counters. The browser wallet signs every action that changes a
user's state.

The public read model no longer trusts hosting-provider identity headers. A
registered wallet signs a five-minute, origin-bound authorization challenge.
The server verifies and consumes it once, then issues a signed, HTTP-only,
same-site session scoped to `/api/index` for seven days. The message explicitly
cannot authorize a transaction or spend REP. Index and challenge endpoints are
rate-limited separately by wallet and keyed network hash.

The current Bradbury contract registers the dedicated CREDREP deployer as its
upgrade authority. Future code upgrades must preserve the declared storage
layout, and the deployed code and transaction remain publicly inspectable.

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
