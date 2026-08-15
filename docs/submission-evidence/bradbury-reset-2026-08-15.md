# CREDREP Bradbury clean-slate deployment

## Deployment

| Field | Value |
| --- | --- |
| Date | `2026-08-15` |
| Network | Bradbury testnet, chain ID `4221` |
| Contract | `0xA723aA83e6fd9d32E99Df853D0c0B7cbf0A3ceb8` |
| Deployment transaction | `0xa40f2283cfa09a353a7c42639e14de0f20d4db9058f4643b34a0b33460c9fc8f` |
| Starting REP | `100` |
| Maximum stake | `2000` basis points (`20%`) |
| Upgrade authority | `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0` |

- [Bradbury contract](https://explorer-bradbury.genlayer.com/address/0xA723aA83e6fd9d32E99Df853D0c0B7cbf0A3ceb8)
- [Deployment receipt](https://explorer-bradbury.genlayer.com/tx/0xa40f2283cfa09a353a7c42639e14de0f20d4db9058f4643b34a0b33460c9fc8f)

The deployment reached `ACCEPTED` with `FINISHED_WITH_RETURN`. Its public schema
matches the tested CREDREP contract, and the deployer is registered as the
onchain upgrade authority.

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

The previous product wallet returned `UNBOUND` with no X identity on the new
contract. Browser transaction tracking and public database reads are keyed by
the active contract address, so the application begins with no users or
positions while the previous immutable contract remains archived.

## Archived namespace

The former contract
[`0x0d2527Fd9FFdC2fb648C55bb8dBf4Cb32452E51d`](https://explorer-bradbury.genlayer.com/address/0x0d2527Fd9FFdC2fb648C55bb8dBf4Cb32452E51d)
is retained only as historical evidence and is no longer read by CREDREP.
