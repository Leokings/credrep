# CREDREP branded clean-slate deployment

## Deployment

| Field | Value |
| --- | --- |
| Date | `2026-08-15` |
| Network | Bradbury testnet, chain ID `4221` |
| Contract | `0x35aC6436e59814Eb48c12850429D7a4BE1048c77` |
| Deployment transaction | `0xeaebb8f560d497eb18c42e823017910bedb0e92eaaafe979c638d0d6e7b280b4` |
| Starting REP | `100` |
| Maximum stake | `2000` basis points (`20%`) |
| Upgrade authority | `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0` |

- [Bradbury contract](https://explorer-bradbury.genlayer.com/address/0x35aC6436e59814Eb48c12850429D7a4BE1048c77)
- [Deployment receipt](https://explorer-bradbury.genlayer.com/tx/0xeaebb8f560d497eb18c42e823017910bedb0e92eaaafe979c638d0d6e7b280b4)

The deployment reached `ACCEPTED` with `FINISHED_WITH_RETURN`. Its public schema
contains all 21 tested CREDREP methods. The deployed source identifies the
contract as `CredrepForecasts` and generates X challenges with `credrep-bind:`
or `credrep-reverify:`. The deployer remains registered onchain as the upgrade
authority.

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

The previously used product wallet returned `UNBOUND`, with no X handle,
identity ID, proof URL, or pending challenge. Browser transaction tracking and
public database reads are keyed by the active contract address, so the live
application starts without users, bindings, or positions.

## Archived namespace

The former contract
[`0xA723aA83e6fd9d32E99Df853D0c0B7cbf0A3ceb8`](https://explorer-bradbury.genlayer.com/address/0xA723aA83e6fd9d32E99Df853D0c0B7cbf0A3ceb8)
is retained only as immutable historical evidence and is no longer read by
CREDREP.
