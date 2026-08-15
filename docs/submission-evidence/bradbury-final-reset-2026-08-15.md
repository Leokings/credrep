# CREDREP final clean-slate deployment

## Deployment

| Field | Value |
| --- | --- |
| Date | `2026-08-15` |
| Network | Bradbury testnet, chain ID `4221` |
| Contract | `0x3b77138d702e51069Fd3F66C3932606Af95053aB` |
| Deployment transaction | `0x94cd0a2926c85182bf200ab0d06f231a880e6bd92b6b2cd9abf42203bc2eac7f` |
| Starting REP | `100` |
| Maximum stake | `2000` basis points (`20%`) |
| Upgrade authority | `0x91B1b2D1f2De66400fcbeAEbadB8a5330eB28DC0` |

- [Bradbury contract](https://explorer-bradbury.genlayer.com/address/0x3b77138d702e51069Fd3F66C3932606Af95053aB)
- [Deployment transaction](https://explorer-bradbury.genlayer.com/tx/0x94cd0a2926c85182bf200ab0d06f231a880e6bd92b6b2cd9abf42203bc2eac7f)

The deployment reached `ACCEPTED` with `FINISHED_WITH_RETURN`. It was submitted
at `2026-08-15 11:07:28 UTC` and accepted at `11:14:57 UTC`, a 449-second
Bradbury consensus interval. Its public schema contains all 21 CREDREP methods.
The deployed source includes the active contract address in every X binding and
reverification challenge, so a post cannot be replayed after another rotation.

## Fresh-state verification

Immediately after acceptance, `get_protocol_stats` returned:

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

For wallet `0x63038a310a46AC61A59c1bC5eAD5fe41040eF38e`, the new contract returned
`registered: false`, `x_identity_status: UNBOUND`, `predictions_made: 0`, and
an inactive binding challenge with attempt `0`. The production database index
is scoped to the active contract address, so earlier profiles and positions are
not returned by the new site.

## Pending-transaction fix

The reported test transaction
[`0x8587d0fb…21f93f`](https://explorer-bradbury.genlayer.com/tx/0x8587d0fb2a87fe5c12ee82426ac858890b1608c3ea0e31b8f860ce8b1221f93f)
also completed successfully with `FINISHED_WITH_RETURN`, but Bradbury needed 436
seconds to accept it while the previous browser wait stopped after 240 seconds.
CREDREP now waits for up to 30 minutes and independently checks a submitted
transaction every four seconds. When a challenge is accepted, the verification
input opens automatically without a refresh or a second transaction.

## Validation

- GenVM lint: passed (`21` methods, `12` writes, `9` views)
- Direct contract tests: `17` passed
- Production build and rendered application tests: `6` passed
- ESLint: passed
- Governance read: upgradeable, with the authority listed above

## Archived namespace

The previous contract
[`0x35aC6436e59814Eb48c12850429D7a4BE1048c77`](https://explorer-bradbury.genlayer.com/address/0x35aC6436e59814Eb48c12850429D7a4BE1048c77)
is retained only as immutable historical evidence and is no longer read by the
current application.
