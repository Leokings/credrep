# CREDREP Bradbury evidence

## Result

**PASS** - the active CREDREP contract completed the public production flow on
Bradbury. The wallet created a contract-bound X challenge, validators verified
control of `@plain3rd`, the contract awarded 100 REP, and the wallet backed a
live Polymarket question with 2 REP.

| Field | Value |
| --- | --- |
| Evidence captured | `2026-08-15T13:02:44Z` |
| Network | Bradbury testnet, chain ID `4221` |
| Contract | `0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd` |
| Product wallet | `0x63038a310a46ac61a59c1bc5ead5fe41040ef38e` |
| Verified X account | `@plain3rd` |
| Verification post | `https://x.com/plain3rd/status/2088599434388983964` |
| Live application | `https://credrep.xyz` |

## Finalized transactions

All four receipts are `FINALIZED` with `FINISHED_WITH_RETURN`, five validators,
and no failed execution.

| Step | Contract method | Submitted (UTC) | Finalized (UTC) | Transaction |
| --- | --- | --- | --- | --- |
| Deploy contract | deployment | `2026-08-15T11:50:18Z` | `2026-08-15T12:20:28Z` | [`0xeb18...7d7a`](https://explorer-bradbury.genlayer.com/tx/0xeb18133c1470fe956ea4c0e89cdc2e419f8ed9fe5e0959e21060ca1937577d7a) |
| Create X challenge | `begin_x_binding` | `2026-08-15T12:10:55Z` | `2026-08-15T12:41:06Z` | [`0x84fe...fbb6`](https://explorer-bradbury.genlayer.com/tx/0x84feffeb3dba8562682e375af5df87b28f13a94f7d268c2beb60b1c6d3adfbb6) |
| Verify X | `verify_x_binding` | `2026-08-15T12:11:41Z` | `2026-08-15T12:42:55Z` | [`0xd397...2518`](https://explorer-bradbury.genlayer.com/tx/0xd39782e68a6d0cbf4612ebbfe1f42c1e4146199deb8940a0bb9a447498712518) |
| Back forecast | `make_prediction` | `2026-08-15T12:12:45Z` | `2026-08-15T12:42:56Z` | [`0x88bf...4d21`](https://explorer-bradbury.genlayer.com/tx/0x88bf53ec5f40b0d6536c191bfe79ffa6eb3172d5292871335c2082bafc6b4d21) |

## Authoritative state

Direct contract reads after finalization returned:

- Identity: `VERIFIED`, handle `plain3rd`, `can_predict: true`.
- REP: `100` total, `98` available, `2` at risk.
- Record: `1` prediction made and `1` open prediction.
- Position: market `2774056`, `NO`, `9100` confidence bps, `2` REP, `OPEN`.
- Market: "Strait of Hormuz traffic returns to normal by August 31?", sourced
  from the canonical [Polymarket page](https://polymarket.com/event/strait-of-hormuz-traffic-returns-to-normal-by-august-31-20260702154212320).
- Verification challenge: the proof text contains both the contract and wallet
  addresses, preventing reuse against another deployment.

At `2026-08-15T13:02:44Z`, the production database reported the same contract,
one indexed profile, one leaderboard entry, and one activity record. The
sourced-market cache contained 45 live questions.

The contract is visible on the
[Bradbury Explorer](https://explorer-bradbury.genlayer.com/address/0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd).

## Reproduction commands

```powershell
genlayer network set testnet-bradbury
genlayer receipt 0xeb18133c1470fe956ea4c0e89cdc2e419f8ed9fe5e0959e21060ca1937577d7a --status FINALIZED
genlayer receipt 0x84feffeb3dba8562682e375af5df87b28f13a94f7d268c2beb60b1c6d3adfbb6 --status FINALIZED
genlayer receipt 0xd39782e68a6d0cbf4612ebbfe1f42c1e4146199deb8940a0bb9a447498712518 --status FINALIZED
genlayer receipt 0x88bf53ec5f40b0d6536c191bfe79ffa6eb3172d5292871335c2082bafc6b4d21 --status FINALIZED
genlayer call 0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd get_identity_status --args 0x63038a310a46ac61a59c1bc5ead5fe41040ef38e
genlayer call 0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd get_user_profile --args 0x63038a310a46ac61a59c1bc5ead5fe41040ef38e
genlayer call 0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd get_position --args 0x63038a310a46ac61a59c1bc5ead5fe41040ef38e 2774056
genlayer call 0x7aD0ca207FdD300801FaD7Df67DDb8A8A1E13dBd get_market --args 2774056
```
