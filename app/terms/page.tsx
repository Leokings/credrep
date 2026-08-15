import type { Metadata } from "next";
import { LegalPage } from "../../components/legal-page";

export const metadata: Metadata = { title: "Terms — CREDREP" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="PUBLIC BETA" title="Terms of use">
      <section>
        <h2>What CREDREP is</h2>
        <p>
          CREDREP is experimental social-forecasting software on the GenLayer
          Bradbury testnet. It lets one person back a forecast with that
          person&apos;s non-transferable reputation points. It is not a betting
          pool, exchange, sportsbook, or investment product.
        </p>
      </section>
      <section>
        <h2>No money or financial value</h2>
        <p>
          REP has no cash value, cannot be purchased, sold, transferred, or
          redeemed, and is only a testnet performance signal. Questions sourced
          from third parties are presented for forecasting context, not as
          financial, legal, political, or betting advice.
        </p>
      </section>
      <section>
        <h2>Eligibility and responsible use</h2>
        <p>
          You must be at least 18 and legally permitted to use this software in
          your location. Do not automate abuse, impersonate another person,
          submit deceptive X proofs, attack the service, or attempt to bypass
          identity and rate-limit controls.
        </p>
      </section>
      <section>
        <h2>Public records and external services</h2>
        <p>
          Wallet addresses, linked public X identity evidence, forecasts, and
          REP outcomes are public or derived from public testnet data. Market
          questions come from external sources such as Polymarket. CREDREP is
          not affiliated with or endorsed by those sources, and their data may
          be delayed, changed, or unavailable.
        </p>
      </section>
      <section>
        <h2>Testnet and contract risk</h2>
        <p>
          Transactions can fail, take time to finalize, or be affected by
          validator, wallet, RPC, source, and testnet behavior. The contract is
          upgradeable by the published upgrade authority. Open markets can be
          voided and REP refunded after the documented stale-market timeout.
        </p>
      </section>
      <section>
        <h2>Availability and changes</h2>
        <p>
          The beta is provided as available, without warranties. Features,
          scoring rules, sources, contracts, and these terms may change. To the
          extent allowed by law, the project operator is not liable for losses
          caused by use of, inability to use, or reliance on the beta.
        </p>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Use the support channel through which you received the beta link and
          follow the safe reporting guidance on the Support page.
        </p>
      </section>
    </LegalPage>
  );
}
