import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-shell">
      <Link className="legal-brand" href="/">
        CREDREP
      </Link>
      <article className="legal-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated August 14, 2026</p>
        <div className="legal-copy">{children}</div>
      </article>
      <nav className="legal-nav" aria-label="Legal and support">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/support">Support</Link>
      </nav>
    </main>
  );
}
