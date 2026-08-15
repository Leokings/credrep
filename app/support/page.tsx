import type { Metadata } from "next";
import { LegalPage } from "../../components/legal-page";

export const metadata: Metadata = { title: "Support — CREDREP" };

export default function SupportPage() {
  return (
    <LegalPage eyebrow="BETA SUPPORT" title="Report an issue safely">
      <section>
        <h2>Where to report</h2>
        <p>
          Reply through the same project channel that supplied this beta link.
          A permanent public support address will be added before access expands
          beyond the current beta group.
        </p>
      </section>
      <section>
        <h2>What to include</h2>
        <p>
          Include the page, approximate time, public wallet address, transaction
          hash if relevant, and what you expected to happen. Screenshots are
          useful after removing unrelated personal information.
        </p>
      </section>
      <section>
        <h2>Never send secrets</h2>
        <p>
          CREDREP support will never ask for a seed phrase, private key,
          password, recovery code, or remote control of your device. Anyone who
          asks for one is not providing legitimate support.
        </p>
      </section>
    </LegalPage>
  );
}
