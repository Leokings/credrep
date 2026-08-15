# CREDREP production clean-slate rotation

## Deployment

| Field | Value |
| --- | --- |
| Date | `2026-08-15` |
| Network | Bradbury testnet, chain ID `4221` |
| Contract | `0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd` |
| Deployment transaction | `0xeb18133c1470fe956ea4c0e89cdc2e419f8ed9fe5e0959e21060ca1937577d7a` |
| Starting REP | `100` |
| Maximum stake | `2000` basis points (`20%`) |
| Upgrade authority | `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0` |

- [Bradbury contract](https://explorer-bradbury.genlayer.com/address/0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd)
- [Deployment transaction](https://explorer-bradbury.genlayer.com/tx/0xeb18133c1470fe956ea4c0e89cdc2e419f8ed9fe5e0959e21060ca1937577d7a)

The deployment was submitted at `2026-08-15 11:50:18 UTC` and reached
`ACCEPTED` at `11:50:41 UTC` with five validators and
`FINISHED_WITH_RETURN`.

## Fresh-state verification

Immediately after deployment, `get_protocol_stats` returned:

```json
{
  "users": 0,
  "markets": 0,
  "predictions": 0,
  "starting_reputation": 100,
  "max_stake_bps": 2000,
  "total_bonus_minted": 0,
  "total_reputation_burned": 0,
  "total_reputation_recovered": 0
}
```

Wallet `0x63038a310a46AC61A59c1bC5eAD5fe41040eF38e` returned `registered: false`,
`x_identity_status: UNBOUND`, `predictions_made: 0`, and an inactive binding
challenge at attempt `0`. The deployed source retains contract-bound X
challenges and the registered upgrade authority.

The production database reads are scoped to the active contract address.
Therefore profiles, leaderboard entries, and activity from previous contracts
are excluded without deleting immutable on-chain evidence.

## Archived namespace

The previous contract
[`0x3b77138d702e51069Fd3F66C3932606Af95053aB`](https://explorer-bradbury.genlayer.com/address/0x3b77138d702e51069Fd3F66C3932606Af95053aB)
contained one user, one market, and one prediction when it was retired. It is no
longer read by the current application.
