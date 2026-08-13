"use client";

import type { Claim } from "../lib/product-data";
import { BRADBURY_EXPLORER_URL } from "../lib/deployment";
import { ClockIcon, ShieldIcon } from "./icons";

type Props = {
  claim: Claim;
  featured?: boolean;
  isOwner?: boolean;
};

function formatResolution(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ClaimCard({ claim, featured, isOwner }: Props) {
  return (
    <article className={`market-card claim-card ${featured ? "market-card-featured" : ""}`}>
      <div className="market-card-topline">
        <span className="market-eyebrow">
          {claim.category} · Personal claim
          {claim.contractClaimId && <b className="onchain-tag">ON-CHAIN</b>}
        </span>
        <span className={`market-status claim-status-${claim.status.toLowerCase()}`}>
          <span aria-hidden="true" className="market-status-dot" />
          {claim.status === "OPEN" ? `${claim.stake} REP at risk` : claim.status}
        </span>
      </div>

      <div className="claim-owner">
        <span className="avatar">{initials(claim.ownerName)}</span>
        <span>
          <strong>{isOwner ? "You" : claim.ownerName}</strong>
          <small>{claim.ownerHandle}</small>
        </span>
        <i>put {claim.stake} of their own reputation behind this</i>
      </div>

      <h3>“{claim.statement}”</h3>

      <div className="claim-mechanic" aria-label="Personal reputation outcomes">
        <div>
          <span>If true</span>
          <strong>{claim.stake * 2} REP returned</strong>
          <small>net +{claim.stake}</small>
        </div>
        <div>
          <span>If false</span>
          <strong>0 REP returned</strong>
          <small>net -{claim.stake}</small>
        </div>
        <div>
          <span>Counterparty</span>
          <strong>None</strong>
          <small>not a pool</small>
        </div>
      </div>

      <details className="claim-rules">
        <summary><ShieldIcon /> Frozen resolution rule</summary>
        <p>{claim.rules}</p>
      </details>

      <footer className="market-card-footer">
        <span><ClockIcon /> Resolves {formatResolution(claim.resolutionAt)}</span>
        <a href={claim.sourceUrl} rel="noreferrer" target="_blank">Source: {claim.sourceLabel} ↗</a>
        {claim.contractClaimId && (
          <a href={BRADBURY_EXPLORER_URL} rel="noreferrer" target="_blank" title={claim.transactionHash || claim.contractClaimId}>
            Proof ↗
          </a>
        )}
      </footer>
    </article>
  );
}
