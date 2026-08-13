# Credence architecture

Credence is a unilateral reputation-commitment system. Every account starts
with 100 non-transferable reputation points. A claim has exactly one owner and
one stake. There are no counterparties, opposing positions, odds, shares,
liquidity, or pooled payouts.

## Settlement invariant

When a person with 100 REP backs a claim with 1 REP:

| Resolution | Amount returned | Final reputation |
| --- | ---: | ---: |
| TRUE | 2 REP | 101 REP |
| FALSE | 0 REP | 99 REP |
| VOID | 1 REP | 100 REP |

The stake is deducted from available reputation and shown as at risk while the
claim is open. A TRUE resolution returns the original stake plus an equal bonus.
A FALSE resolution permanently burns the stake. A VOID resolution only refunds
the original stake.

## Frontend and D1 own

- ChatGPT sign-in, profiles, discovery, search, and leaderboards.
- A private preview ledger for claims made before wallet signing is enabled.
- Indexing public claim receipts and presenting available versus at-risk REP.
- Non-authoritative interface states and transaction progress.

The D1 preview never decides whether a claim is true.

## GenLayer owns

- Registration and the 100 REP starting balance.
- One-owner claim creation, immutable statement, rules, sources, deadline, and stake.
- Locking a person's own REP without creating a pool.
- Validator consensus over approved public evidence.
- TRUE/FALSE/VOID settlement and permanent reputation accounting.
- Auditable user, category, and protocol records.

## External sources own

External sources provide raw facts only. A claimant freezes one to three HTTPS
sources and an explicit resolution rule before staking. Validators independently
re-fetch the evidence and must agree on the substantive outcome.

## Flow

```text
person writes a future claim
  -> chooses evidence, rule, deadline, and personal REP stake
  -> contract deducts stake from available REP and marks it at risk
  -> after the deadline, any caller requests resolution
  -> validators independently inspect the frozen evidence
  -> TRUE: credit 2x stake | FALSE: burn stake | VOID: refund stake
  -> site indexes the immutable personal record
```

## Deployment modes

- `preview`: illustrative browser state for signed-out visitors.
- `indexed`: authenticated D1 claim ledger; no on-chain settlement claim is made.
- `contract`: Bradbury transactions and indexed contract receipts after deployment.
