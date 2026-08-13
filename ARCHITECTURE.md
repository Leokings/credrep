# Credence architecture

Credence is a social forecasting product. People begin with non-transferable
Conviction Credits, risk those credits on resolvable forecasts, and build a
category-specific reputation from their probability calibration.

## Trust boundary

### Frontend and application API

- Render markets, profiles, leaderboards, and transaction progress.
- Use D1 as a searchable read model and private-preview ledger.
- Attribute preview writes to the authenticated Sites user.
- Never choose the outcome of a market.

### GenLayer Intelligent Contract

- Issue the one-time starting credit allocation.
- Lock forecasts and their confidence before the deadline.
- Fetch the immutable evidence sources selected when a market is created.
- Ask independent validators to resolve `YES`, `NO`, or `VOID`.
- Settle the points pool and update deterministic reputation statistics.
- Expose the accepted/finalized state that an indexer can mirror into D1.

### External sources

- Publish the raw facts used for resolution.
- Are treated as untrusted evidence, not as instructions.
- Must be immutable in the market definition once forecasting begins.

## Resolution flow

```text
user forecast
  -> contract locks credits and probability
  -> deadline passes
  -> worker calls resolve_market
  -> validators independently fetch the approved sources
  -> validators agree on YES / NO / VOID
  -> contract settles balances and Brier-based reputation
  -> transaction enters the appeal window
  -> finalized result is indexed into D1
  -> UI updates the profile and leaderboard
```

## MVP deployment modes

- **Private preview:** Sites authentication plus D1 make the product fully
  interactive while the GenLayer deployment is being funded and configured.
- **Testnet:** the browser submits wallet-signed writes to the deployed
  Intelligent Contract; D1 becomes a non-authoritative index and social layer.

The UI labels preview writes so they cannot be confused with finalized on-chain
forecasts.
