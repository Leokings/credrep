# Credence architecture

Credence is a unilateral reputation-commitment system. A wallet receives 100
non-transferable reputation points only after GenLayer verifies a public X
challenge post. A claim has exactly one owner and one stake. There are no
counterparties, opposing positions, odds, shares, liquidity, or pooled payouts.

## Identity invariant

One stable X account ID can bind to one wallet, and one wallet can bind to one
X account. The contract, not the website database, enforces both directions.
The proof is valid for 30 days, followed by a 7-day grace period. A stale
identity keeps its history and balance but cannot make claims or collect
recovery until a permissionless recheck succeeds. Contracts do not wake up by
themselves, so rechecks happen lazily when a person or keeper submits one.

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

## Recovery invariant

If total reputation falls below 20 and no claim remains open, recovery starts
with a 7-day cooldown. It then makes 1 REP claimable per 24 hours until the
balance reaches exactly 100. Starting a new claim cancels recovery. Recovery
can never produce a balance above 100; only a TRUE claim can do that.

## Frontend and D1 own

- ChatGPT sign-in, profiles, discovery, search, and leaderboards.
- A private preview ledger for claims made before wallet signing is enabled.
- MetaMask connection, Bradbury network setup, transaction progress, and public
  reads from the deployed contract.
- Indexing public claim receipts and presenting available versus at-risk REP.
- Non-authoritative interface states and transaction progress.

The D1 preview never decides whether a claim is true.

## GenLayer owns

- Public X challenge generation, one-to-one account binding, and monthly checks.
- Registration and the 100 REP starting balance after identity verification.
- One-owner claim creation, immutable statement, rules, sources, deadline, and stake.
- Locking a person's own REP without creating a pool.
- Validator consensus over approved public evidence.
- TRUE/FALSE/VOID settlement and permanent reputation accounting.
- Recovery cooldown, daily accrual, and the hard 100 REP recovery ceiling.
- Auditable user, category, and protocol records.

## External sources own

External sources provide raw facts only. A claimant freezes one to three HTTPS
sources and an explicit resolution rule before staking. Validators independently
re-fetch the evidence and must agree on the substantive outcome.

## Flow

```text
person connects a wallet
  -> posts its exact challenge from one public X account
  -> GenLayer binds the stable X account ID and grants 100 REP
  -> person writes a future claim
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
- `contract`: the connected wallet signs Bradbury registration and claim
  transactions; the UI changes only after an accepted, successful execution.

## Current Bradbury contract (v2)

The production testnet address is
`0xBFB5C69e93217f3f6AF944225606b9BC60923277`. The deployer is a dedicated
Credence wallet, separate from any workspace wallet. Each product user still
owns their own contract profile and signs their own claim; the deployer does not
custody or spend users' reputation.

The immutable v1 contract remains at
`0x164868c406fe6cFB4a70F93bAE9e3246b5873D34` for historical inspection.
