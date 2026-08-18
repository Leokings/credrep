# CREDREP submission copy

## Date

`08/18/2026`

## Title

`CREDREP — Reputation-Backed Forecasting on GenLayer`

## Notes / Description

CREDREP is a reputation-backed forecasting app on GenLayer. It sources live
binary Polymarket questions; users independently back YES or NO with
non-transferable REP—there is no money, pool, or counterparty. Identity is
cross-checked by matching contract challenges on X and Farcaster, with one
stable ID from each network per wallet. Correct forecasts return stake plus an
equal bonus; wrong forecasts burn stake. At resolution, GenLayer validators
require Polymarket Gamma to match the Polygon Conditional Tokens payout state
fetched through two independent RPC providers. The contract owns identity,
REP, positions, scoring, and settlement. Upgrades publish a code hash and wait
seven days before execution. The MVP also includes monthly identity rechecks,
recovery toward 100 below 20 REP, 30-day stale-market refunds, a Neon read
model, wallet-signed indexing, Vercel deployment, and StudioNet evidence.

Character count: `908 / 1000`

## Steward request addressed

- Identity now requires matching X and Farcaster challenges, stable IDs from
  both networks, one-to-one wallet binding, and monthly reverification.
- Settlement cross-checks Polymarket Gamma against Polygon Conditional Tokens
  through two independent RPC providers before REP can be settled.
- Contract upgrades publish a code hash and wait seven days, preventing the
  upgrade authority from replacing the rules immediately.

## Evidence URLs

| Type | URL |
| --- | --- |
| GitHub Repository | `https://github.com/Leokings/credrep` |
| GitHub File | `https://github.com/Leokings/credrep/blob/main/docs/submission-evidence/studionet-2026-08-18.md` |
| GenLayer Explorer Contract | `https://explorer-studio.genlayer.com/address/0xEB16133048b14a38A6C870409625bbFd0dE08780` |
| GenLayer Explorer Transaction | `https://explorer-studio.genlayer.com/tx/0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4` |
| GenLayer Explorer Transaction | `https://explorer-studio.genlayer.com/tx/0x82c9068c81395d31f20c9048d4e3412c920b926c2a4a94b21cb8cf67587c1d98` |
| GenLayer Explorer Transaction | `https://explorer-studio.genlayer.com/tx/0x7a1ca69396ece5d3d2c3683df9b3ef9834494b0fea9f9a27a8dc7562a70a6b3e` |
| GenLayer Explorer Transaction | `https://explorer-studio.genlayer.com/tx/0x60f0a69d5ebc4dec1be748bc28204eedb83aed561249543719648e7692fb3ca4` |
| Other (live app) | `https://credrep.xyz` |
