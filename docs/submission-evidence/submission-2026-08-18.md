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

## Evidence URLs

| Type | URL |
| --- | --- |
| GitHub Repository | `https://github.com/Leokings/credrep` |
| GitHub File | `https://github.com/Leokings/credrep/blob/main/docs/submission-evidence/studionet-2026-08-18.md` |
| GenLayer Explorer Contract | `https://explorer-studio.genlayer.com/address/0x3Aaed2C86b91013e97221dEEa4613eA211F8810f` |
| GenLayer Explorer Transaction | `https://explorer-studio.genlayer.com/tx/0x3e13174a96e25919f7bbb41d22bd9b68064e423cd5c787f2c96a7057bdfbc8c6` |
| Other (live app) | `https://credrep.xyz` |
