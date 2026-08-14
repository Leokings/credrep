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
- Contract: `0xc50bFcE3729182fE251BeAE0b759C8Fc1b8f649e`
- Deployment transaction: `0xab5db18406683d8449f05a8b7a115a8c54dc6c607a7eaf87d2938a1bc0246564`

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

The repository also runs the web checks, production dependency audit, GenVM
lint, and direct contract tests in GitHub Actions. `GET /api/health` reports the
deployed contract configuration and D1 connectivity without exposing user data.

See `ARCHITECTURE.md` for the trust and settlement boundaries.
