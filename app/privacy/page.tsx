import type { Metadata } from "next";
import { LegalPage } from "../../components/legal-page";

export const metadata: Metadata = { title: "Privacy — Credence" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="PUBLIC BETA" title="Privacy notice">
      <section>
        <h2>Data Credence processes</h2>
        <p>
          Credence indexes public Bradbury data for connected wallet addresses,
          including public X handles and proof URLs recorded by the contract,
          REP balances, forecasts, confidence, and outcomes. The app also stores
          sourced market metadata and short-lived wallet authorization
          challenges.
        </p>
      </section>
      <section>
        <h2>Wallet authorization</h2>
        <p>
          Index refreshes use a human-readable wallet signature. It cannot move
          funds, submit a transaction, or spend REP. A signed, HTTP-only session
          cookie keeps the refresh active for up to seven days. Credence never
          asks for or receives your wallet seed phrase or private key.
        </p>
      </section>
      <section>
        <h2>Security and service data</h2>
        <p>
          Requests may generate operational logs, approximate network and device
          information, performance measurements, and keyed hashes used to
          enforce rate limits. Vercel Analytics and Speed Insights provide
          aggregate traffic and performance information. Do not include a seed
          phrase, private key, or other secret in a support report.
        </p>
      </section>
      <section>
        <h2>Why data is used</h2>
        <p>
          Data is used to operate the feed, public prediction record,
          leaderboard, abuse prevention, debugging, security, and product
          performance. The database is a convenience index; GenLayer remains
          the source of truth for onchain state.
        </p>
      </section>
      <section>
        <h2>Providers and retention</h2>
        <p>
          Processing involves GenLayer, X, Polymarket, Vercel, and Neon. Public
          blockchain records may be permanent. Cache, challenge, rate-limit,
          log, and analytics retention follows operational need and provider
          settings. Expired authorization challenges and rate-limit entries may
          be deleted routinely.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can disconnect your wallet, decline the index signature, or stop
          using the beta. This does not erase public blockchain records or data
          already published on X. Use the beta support channel for privacy or
          data-index questions and include only your public wallet address.
        </p>
      </section>
    </LegalPage>
  );
}
