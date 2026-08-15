# CREDREP

CREDREP turns live public questions into personal, reputation-backed forecasts.
The site sources active binary questions from Polymarket; users choose YES or
NO and stake only their own non-transferable REP. There is no money, liquidity,
counterparty, or payout pool in CREDREP.

**Live MVP:** [credrep.xyz](https://credrep.xyz)

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

Hosted consensus-test evidence is recorded in
[`docs/submission-evidence/studionet-2026-08-14.md`](docs/submission-evidence/studionet-2026-08-14.md).
Bradbury identity and forecast receipts are recorded in
[`docs/submission-evidence/bradbury-2026-08-14.md`](docs/submission-evidence/bradbury-2026-08-14.md).

## Bradbury

- Chain ID: `4221`
- Contract: [`0x0d2527Fd9FFdC2fb648C55bb8dBf4Cb32452E51d`](https://explorer-bradbury.genlayer.com/address/0x0d2527Fd9FFdC2fb648C55bb8dBf4Cb32452E51d)
- Deployment transaction: [`0x3956ffb…aa3a3`](https://explorer-bradbury.genlayer.com/transactions/0x3956ffb5379a36339719da05619f8be558e01d0939c8290927754e3bb20aa3a3)
- Upgrade authority: `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0`

The deployer is a dedicated CREDREP wallet and is registered onchain as the
upgrade authority. Product users connect and sign with their own wallets; the
site never receives the deployer key.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

The web runtime is standard Next.js. `DATABASE_URL` points to the dedicated
Neon Postgres project; `INDEX_SESSION_SECRET` signs seven-day HTTP-only wallet
index sessions; and `RATE_LIMIT_SECRET` keys pseudonymous abuse-prevention
hashes. Generate different random values for the two secrets and never commit
`.env.local`.

Create and apply the Postgres schema with:

```bash
npm run db:generate
npm run db:migrate
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
deployed contract configuration and Postgres connectivity without exposing
credentials or user data. Vercel runtime logs are structured JSON; Vercel Web
Analytics and Speed Insights are installed in the root layout.

## Public index authorization

GenLayer remains the source of truth. A connected, registered wallet signs one
human-readable, short-lived challenge before the backend refreshes its public
record. The signature cannot submit a transaction or spend REP. A signed,
HTTP-only cookie permits silent refreshes for seven days; index and challenge
writes are rate-limited by wallet and keyed network hash.

## Wallet safety

The frontend requests account access, adds or switches to Bradbury when needed,
signs the human-readable public-index authorization above, and submits
zero-value calls to the CREDREP contract. It has no token or NFT approval path,
no asset-transfer path, and never asks for a seed phrase or private key.

See `ARCHITECTURE.md` for the trust and settlement boundaries.
