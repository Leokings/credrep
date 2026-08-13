# Credence

Credence lets one person put their own reputation behind a public future claim.
Every account starts with 100 non-transferable REP. There is no betting pool,
counterparty, liquidity, odds, or token purchase.

- TRUE returns twice the stake, for a net gain equal to the stake.
- FALSE returns nothing and permanently burns the stake.
- VOID refunds the original stake.

The web app provides ChatGPT sign-in, persistent D1 claim records, public claim
discovery, personal records, and a reputation leaderboard. The GenLayer
contract owns the authoritative claim, evidence, resolution, and settlement
state.

## Local website

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
genvm-lint check contracts/credence_claims.py
pytest tests/direct -q
```

See `ARCHITECTURE.md` for the contract boundary and exact settlement invariant.
