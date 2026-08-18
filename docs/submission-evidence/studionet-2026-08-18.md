# CREDREP StudioNet integration evidence

## Result

**PASS** — the CREDREP intelligent contract deployed on GenLayer StudioNet,
fetched a live binary Polymarket question through validator consensus, stored
its canonical Polygon condition ID, and enforced a seven-day scheduled-upgrade
window.

| Field | Value |
| --- | --- |
| Run time | 2026-08-18T07:14:00-07:00 |
| Network | `studionet` |
| RPC | `https://studio.genlayer.com/api` |
| Leader-only mode | `false` |
| Test runner | `genlayer-test 0.29.2`, `pytest 9.1.1` |
| Python | `3.12.13` |
| Production contract | [`0xEB16133048b14a38A6C870409625bbFd0dE08780`](https://explorer-studio.genlayer.com/address/0xEB16133048b14a38A6C870409625bbFd0dE08780) |
| Production deployment | [`0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4`](https://explorer-studio.genlayer.com/tx/0xbbac18675bfc8aaeb3ed9d621297c7faa7c77a7b2ac57d7e0553dcb065a6ffb4) |
| Fresh production state | `0 users / 0 markets / 0 predictions` |
| Live Polymarket market ID | `2252245` |
| Disposable integration contract | `0x620b91820637d0f60BECF01F9537f7B740498c54` |
| Integration sync transaction | `0x1217f371f8ee3e421b48090abc544f8ae42bc05a402fa37ace5d92a389d3666c` |
| Leader execution result | `SUCCESS` |
| Test duration | `89.35s` |

## Tested assertions

- Contract deployment completed with successful execution.
- `sync_market` completed with successful leader execution under validator
  consensus.
- The stored question matched the live Polymarket response.
- The stored market was `OPEN` and had a canonical Polymarket source URL.
- The stored Polygon condition ID matched Gamma's market record.
- The market exposed Polygon Conditional Tokens as its settlement source.
- The permissionless void time was exactly 30 days after the market deadline.
- Protocol statistics reported one synchronized market.
- Governance reported a seven-day upgrade delay and no pending upgrade.
- Scheduling a code hash succeeded, and its public execution time was exactly
  seven days after scheduling.
- Governance reported the 30-day stale-market timeout.
- Direct regression coverage verifies Farcaster's 65-byte EIP-712 fname server
  signature shape before identity activation.

## Reproduction command

Run from the repository root after installing `requirements.txt`:

```powershell
gltest tests/integration/test_credence_forecasts.py -v -s --network studionet
```

StudioNet is gasless, so this test does not require funded GEN.

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

## Captured output

```text
============================= test session starts =============================
platform win32 -- Python 3.12.13, pytest-9.1.1, pluggy-1.6.0
plugins: anyio-4.14.2, genlayer-test-0.29.2
collected 1 item

tests/integration/test_credence_forecasts.py::test_live_polymarket_question_reaches_genlayer_consensus
EVIDENCE market_id=2252245
EVIDENCE contract_address=0x620b91820637d0f60BECF01F9537f7B740498c54
EVIDENCE sync_transaction=0x1217f371f8ee3e421b48090abc544f8ae42bc05a402fa37ace5d92a389d3666c
EVIDENCE sync_execution_result=SUCCESS
PASSED

======================== 1 passed in 89.35s (0:01:29) =========================
INFO: File `gltest.config.yaml` found in the current directory, using it
INFO: RPC URL: https://studio.genlayer.com/api
INFO: Selected Network: studionet
INFO: Leader only mode: False
```

This file records a point-in-time hosted-network run. The integration test and
hashes above are the reproducible evidence.
