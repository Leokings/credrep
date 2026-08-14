# Credence

Credence turns live public questions into personal, reputation-backed forecasts.
The site sources active binary questions from Polymarket; users choose YES or
NO and stake only their own non-transferable REP. There is no money, liquidity,
counterparty, or payout pool in Credence.

- A verified X account starts with 100 REP.
- Correct: return the stake plus an equal REP bonus.
- Wrong: permanently burn the stake.
- Void: refund the stake.
- Prediction Score averages a Brier-style calibration score using each stated
  confidence, while accuracy is tracked separately.
- Below 20 REP, an account with no open position can slowly recover to 100.

The public feed is a cached browsing index. GenLayer validators independently
fetch the selected Polymarket market before accepting a forecast and again when
resolving it. The contract is authoritative for identity, REP, positions,
scores, and settlement.

## Bradbury

- Chain ID: `4221`
- Contract: `0x2d93e493144A0e0f1dc6E4803e15c21EAb219072`
- Deployment transaction: `0x09214ecfd8e0e19135a55d8cfd477361196ebec7acbe76e1a11f877e1befa36f`

The deployer is a dedicated Credence wallet. Product users connect and sign
with their own wallets; the site never receives the deployer key.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run lint
genvm-lint check contracts/credence_claims.py
pytest tests/direct -q
gltest tests/integration/test_credence_forecasts.py -v -s --network studionet
```

See `ARCHITECTURE.md` for the trust and settlement boundaries.
