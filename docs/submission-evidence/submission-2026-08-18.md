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
model, wallet-signed indexing, Vercel deployment, and StudioNet/Bradbury
evidence.

Character count: `917 / 1000`

## Evidence URLs

| Type | URL |
| --- | --- |
| GitHub Repository | `https://github.com/Leokings/credrep` |
| GitHub File | `https://github.com/Leokings/credrep/blob/main/docs/submission-evidence/bradbury.md` |
| GitHub File | `https://github.com/Leokings/credrep/blob/main/docs/submission-evidence/studionet-2026-08-18.md` |
| GenLayer Studio Contract | `https://studio.genlayer.com/contracts/0xDEd3428055f7bC6aa7D1cEF9f010f4D2BB610950` |
| GenLayer Explorer Contract | `https://explorer-bradbury.genlayer.com/address/0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd` |
| X Post | `https://x.com/plain3rd/status/2088599434388983964` |
| Other (live app) | `https://credrep.xyz` |
