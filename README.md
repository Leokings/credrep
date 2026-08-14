# Credence

Credence turns live public questions into personal, reputation-backed forecasts.
The site sources active binary questions from Polymarket; users choose YES or
NO and stake only their own non-transferable REP. There is no money, liquidity,
counterparty, or payout pool in Credence.

- A verified X account starts with 100 REP.
- Correct: return the stake plus an equal REP bonus.
- Wrong: permanently burn the stake.
- Void: refund the stake.
- If Polymarket never finalizes a question, anyone can void it 30 days after
  its deadline so REP cannot remain locked indefinitely.
- Prediction Score averages a Brier-style calibration score using each stated
  confidence, while accuracy is tracked separately.
- Below 20 REP, an account with no open position can slowly recover to 100.

The public feed is a cached browsing index. GenLayer validators independently
fetch the selected Polymarket market before accepting a forecast and again when
resolving it. The contract is authoritative for identity, REP, positions,
scores, and settlement.

## Bradbury

- Chain ID: `4221`
- Contract: `0x0d2527Fd9FFdC2fb648C55bb8dBf4Cb32452E51d`
- Deployment transaction: `0x3956ffb5379a36339719da05619f8be558e01d0939c8290927754e3bb20aa3a3`
- Upgrade authority: `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0`

The deployer is a dedicated Credence wallet and is registered onchain as the
upgrade authority. Product users connect and sign with their own wallets; the
site never receives the deployer key.

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

The repository also runs the web checks, production dependency audit, GenVM
lint, and direct contract tests in GitHub Actions. `GET /api/health` reports the
deployed contract configuration and D1 connectivity without exposing user data.

See `ARCHITECTURE.md` for the trust and settlement boundaries.
