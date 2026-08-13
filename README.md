# Credence

Credence is a social forecasting MVP built around non-transferable Conviction
Credits and category-specific reputation. Users state a binary forecast with a
probability, risk up to 20% of their available credits, and build an auditable
track record after GenLayer validators resolve the outcome.

## Included

- Responsive forecasting website with market search and topic filters
- Interactive forecast composer with confidence and stake controls
- Private Sites/D1 preview ledger and leaderboard read model
- Production-oriented GenLayer Intelligent Contract
- One-time starting-credit allocation and deterministic settlement
- Brier-based overall and category reputation
- YES / NO / VOID resolution with independent validator re-checks
- Direct-mode contract tests

See `ARCHITECTURE.md` for the trust boundary between the website, D1 index, and
GenLayer contract.

## Local development

```powershell
$env:CODEX_LOCAL_PREVIEW = "1"
npm run dev
```

Run a production build with `npm run build`. The full Cloudflare-backed local
runtime requires the Microsoft Visual C++ Redistributable on Windows.

## Contract verification

```powershell
genvm-lint check contracts/credence_market.py
pytest tests/direct -v
```

The contract pins a concrete GenVM runner hash as required for deployment.
