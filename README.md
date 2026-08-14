# Credence

Credence lets one person put their own reputation behind a public future claim.
One public X account binds to one wallet through GenLayer verification, then
starts with 100 non-transferable REP. There is no betting pool, counterparty,
liquidity, odds, or token purchase.

- TRUE returns twice the stake, for a net gain equal to the stake.
- FALSE returns nothing and permanently burns the stake.
- VOID refunds the original stake.
- Below 20 REP, a claim-free account can recover 1 REP per day after a 7-day
  cooldown, up to 100. Only a correct claim can move it above 100.

The web app provides ChatGPT sign-in, persistent D1 claim records, public claim
discovery, personal records, and a reputation leaderboard. The GenLayer
contract owns the authoritative claim, evidence, resolution, and settlement
state.

## Bradbury deployment

- Network: GenLayer Bradbury Testnet (chain ID 4221)
- Contract v2: `0xBFB5C69e93217f3f6AF944225606b9BC60923277`
- Deployment transaction: `0x8baab27651e9b2075c2d682f5c299e6cd3ed2d9241c1257d74fa45cbb045dc22`
- Immutable v1: `0x164868c406fe6cFB4a70F93bAE9e3246b5873D34`

The website reads the deployed contract publicly. A signed-in person connects
their own MetaMask wallet, posts its exact challenge from X, and submits the
public post URL. GenLayer binds the stable X account ID, activates 100 REP, and
requires a fresh verification every 30 days (with a 7-day grace period). The
dedicated deployment key is never sent to the website or committed here.

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
