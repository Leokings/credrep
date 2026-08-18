# CREDREP StudioNet production evidence

## Result

**PASS** — the current CREDREP production contract completed a finalized
dual-source identity binding and a finalized reputation-backed prediction on
GenLayer StudioNet. Every transaction below executed with GenVM result
`SUCCESS` and returned normally.

| Field | Value |
| --- | --- |
| Network | `studionet` |
| Chain ID | `61999` |
| RPC | `https://studio.genlayer.com/api` |
| Leader-only mode | `false` |
| Production contract | [`0xEB16133048b14a38A6C870409625bbFd0dE08780`](https://explorer-studio.genlayer.com/address/0xEB16133048b14a38A6C870409625bbFd0dE08780) |
| Production deployment | [`0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4`](https://explorer-studio.genlayer.com/tx/0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4) |
| Evidence wallet | [`0x63038a310a46AC61A59c1bC5eAD5fe41040eF38e`](https://explorer-studio.genlayer.com/address/0x63038a310a46AC61A59c1bC5eAD5fe41040eF38e) |
| Begin identity binding | [`0x82c9068c81395d31f20c9048d4e3412c920b926c2a4a94b21cb8cf67587c1d98`](https://explorer-studio.genlayer.com/tx/0x82c9068c81395d31f20c9048d4e3412c920b926c2a4a94b21cb8cf67587c1d98) |
| Verify identity binding | [`0x7a1ca69396ece5d3d2c3683df9b3ef9834494b0fea9f9a27a8dc7562a70a6b3e`](https://explorer-studio.genlayer.com/tx/0x7a1ca69396ece5d3d2c3683df9b3ef9834494b0fea9f9a27a8dc7562a70a6b3e) |
| Make prediction | [`0x60f0a69d5ebc4dec1be748bc28204eedb83aed561249543719648e7692fb3ca4`](https://explorer-studio.genlayer.com/tx/0x60f0a69d5ebc4dec1be748bc28204eedb83aed561249543719648e7692fb3ca4) |
| Current protocol state | `1 user / 1 market / 1 prediction` |

## Verified production flow

1. `begin_identity_binding` finalized successfully at
   `2026-08-18T14:54:54.021930Z`.
2. `verify_identity_binding` finalized successfully at
   `2026-08-18T14:56:03.751096Z`.
3. The contract bound X identity `@plain3rd` and Farcaster identity
   `@milechain` to the evidence wallet and reported `dual_source_bound: true`,
   `status: VERIFIED`, and `can_predict: true`.
4. The account received 100 REP.
5. `make_prediction` finalized successfully at
   `2026-08-18T14:57:04.893419Z`.
6. The position stored market ID `2252245`, prediction `NO`, 82% confidence,
   and 1 REP at risk. The position is `OPEN`, leaving 99 REP available.

## Steward request addressed

The build directly addresses the three concerns in the steward request:

- **Identity no longer depends on one upstream service.** A wallet must publish
  the same contract-generated challenge on both X and Farcaster. GenLayer
  validators independently read both proofs, bind one stable X ID and one
  stable Farcaster FID to the wallet, and require monthly reverification.
- **Settlement no longer depends on one upstream resolution service.** Gamma
  supplies Polymarket market metadata, but it cannot settle REP by itself.
  Resolution must match the Polygon Conditional Tokens payout state fetched
  independently through `polygon.drpc.org` and `polygon.publicnode.com`.
- **One authority cannot immediately replace the rules.** An upgrade must
  first publish its code hash onchain and then wait seven days. Pending upgrade
  details are publicly readable, and the proposal can be cancelled during the
  delay.

## Automated validation

- GenVM lint passed for the readable source and exact deployment artifact.
- `22` direct contract tests passed, including the Farcaster 65-byte EIP-712
  signature regression test.
- `10` production web and StudioNet receipt tests passed.
- GitHub CI passed both contract and web jobs:
  [`32150340717`](https://github.com/Leokings/credrep/actions/runs/32150340717).

## Source integrity

```text
contracts/credence_claims.py
SHA256 CF5F7EFB9538C521C931DCA676221585FAD9620714A843016823AFA749C2638B

contracts/credence_claims.deploy.py
SHA256 8059193CE1193D23CE2AC184079F7D4C992432413A55C5464FB947ACB41F7B16

tests/integration/test_credence_forecasts.py
SHA256 3763D4B2147CF7F4CA0B093E7D3CA21DCC0DAD72024624A274714402E5AC003F

gltest.config.yaml
SHA256 81E188ADC1A80EB56E9327BC5C5E6D60ECC7CDE3AA5CA320B04269D449CD453A
```

## Receipt verification

Each current transaction can be independently checked with:

```powershell
genlayer receipt <transaction-hash> --status FINALIZED --stdout --stderr
```

The linked StudioNet Explorer pages expose the method, sender, current
contract, finalized lifecycle status, `SUCCESS` GenVM result, and accepted
consensus result.
