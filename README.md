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

## Bradbury deployment

- Network: GenLayer Bradbury Testnet (chain ID 4221)
- Contract: `0x164868c406fe6cFB4a70F93bAE9e3246b5873D34`
- Deployment transaction: `0xac6a2c68c5a6e07d70d5683e30476e751558af6fd3ecf5bf95b4d95d48f27714`

The website reads the deployed contract publicly. A signed-in person connects
their own MetaMask wallet, activates its one-time 100 REP balance, and signs
their own `make_claim` transaction. The dedicated deployment key is never sent
to the website or committed to this repository.

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
