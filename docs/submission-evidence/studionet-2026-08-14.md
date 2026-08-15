# CREDREP StudioNet integration evidence

## Result

**PASS** — the CREDREP intelligent contract deployed on GenLayer StudioNet,
fetched a live binary Polymarket question through validator consensus, stored
the canonical market, and returned the expected governance configuration.

| Field | Value |
| --- | --- |
| Run time | 2026-08-14T11:25:01-07:00 |
| Network | `studionet` |
| RPC | `https://studio.genlayer.com/api` |
| Leader-only mode | `false` |
| Test runner | `genlayer-test 0.29.2`, `pytest 9.1.1` |
| Python | `3.12.13` |
| Source baseline | `a464322126331b34dd9adea0e49f021ffabf9f47` |
| Live Polymarket market ID | `2774056` |
| StudioNet contract | `0xd2fEE3F35Afcf44a04323bd4D4a9DbCca7887168` |
| StudioNet sync transaction | `0xa3693e1d41a7e67e818f88fd8fa21e3e71ed9e0dc4ed50af49c77978628e0dc3` |
| Leader execution result | `SUCCESS` |
| Test duration | `31.75s` |

## Tested assertions

- Contract deployment completed with successful execution.
- `sync_market` completed with successful leader execution under validator
  consensus.
- The stored question matched the live Polymarket response.
- The stored market was `OPEN` and had a canonical Polymarket source URL.
- The permissionless void time was exactly 30 days after the market deadline.
- Protocol statistics reported one synchronized market.
- Governance reported the contract as upgradeable.
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
SHA256 CB1EAEF88B044CA905B77D7BF415F4522F9FC77A19091CE28204BC181BE29294

tests/integration/test_credence_forecasts.py
SHA256 A79511139A7EE15EDBBF77C08E745D08F856FFBBEF7DB525DBA8C99AA51E59DE

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
EVIDENCE market_id=2774056
EVIDENCE contract_address=0xd2fEE3F35Afcf44a04323bd4D4a9DbCca7887168
EVIDENCE sync_transaction=0xa3693e1d41a7e67e818f88fd8fa21e3e71ed9e0dc4ed50af49c77978628e0dc3
EVIDENCE sync_execution_result=SUCCESS
PASSED

============================= 1 passed in 31.75s ==============================
INFO: File `gltest.config.yaml` found in the current directory, using it
INFO: RPC URL: https://studio.genlayer.com/api
INFO: Selected Network: studionet
INFO: Leader only mode: False
```

This file records a point-in-time hosted-network run. The integration test and
hashes above are the reproducible evidence; StudioNet state itself is not a
substitute for Bradbury end-to-end testing.
