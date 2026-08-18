# CREDREP StudioNet integration evidence

## Result

**PASS** — the CREDREP intelligent contract deployed on GenLayer StudioNet,
fetched a live binary Polymarket question through validator consensus, stored
its canonical Polygon condition ID, and enforced a seven-day scheduled-upgrade
window.

| Field | Value |
| --- | --- |
| Run time | 2026-08-18T05:46:00-07:00 |
| Network | `studionet` |
| RPC | `https://studio.genlayer.com/api` |
| Leader-only mode | `false` |
| Test runner | `genlayer-test 0.29.2`, `pytest 9.1.1` |
| Python | `3.12.13` |
| Live Polymarket market ID | `601835` |
| StudioNet contract | `0xDEd3428055f7bC6aa7D1cEF9f010f4D2BB610950` |
| StudioNet sync transaction | `0x4c4a424d7e5fa6543b3357be7367891549480216b84cd3c3e199cd37b4eda495` |
| Leader execution result | `SUCCESS` |
| Test duration | `40.32s` |

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

## Reproduction command

Run from the repository root after installing `requirements.txt`:

```powershell
gltest tests/integration/test_credence_forecasts.py -v -s --network studionet
```

StudioNet is gasless, so this test does not require funded GEN.

## Source integrity

```text
contracts/credence_claims.py
SHA256 0A029B5C7FF97DCCC43ABFC81614CB3E31F64199D651529E9EA06EEE8952D994

tests/integration/test_credence_forecasts.py
SHA256 0EA0ACB4472540AAD28A96313185CA53DA6589C404424128D0656A8F5DCFAC6A

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
EVIDENCE market_id=601835
EVIDENCE contract_address=0xDEd3428055f7bC6aa7D1cEF9f010f4D2BB610950
EVIDENCE sync_transaction=0x4c4a424d7e5fa6543b3357be7367891549480216b84cd3c3e199cd37b4eda495
EVIDENCE sync_execution_result=SUCCESS
PASSED

============================= 1 passed in 40.32s ==============================
INFO: File `gltest.config.yaml` found in the current directory, using it
INFO: RPC URL: https://studio.genlayer.com/api
INFO: Selected Network: studionet
INFO: Leader only mode: False
```

This file records a point-in-time hosted-network run. The integration test and
hashes above are the reproducible evidence; StudioNet state itself is not a
substitute for Bradbury end-to-end testing.
