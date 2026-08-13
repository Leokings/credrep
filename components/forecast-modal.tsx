"use client";

import { useMemo, useState } from "react";
import type { Market, Outcome } from "../lib/product-data";
import { CheckIcon, CloseIcon, ShieldIcon } from "./icons";

type Props = {
  market: Market;
  initialOutcome: Outcome;
  credits: number;
  mode: "preview" | "indexed" | "contract";
  busy: boolean;
  onClose: () => void;
  onSubmit: (forecast: { outcome: Outcome; confidence: number; stake: number }) => Promise<void>;
};

export function ForecastModal({
  market,
  initialOutcome,
  credits,
  mode,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const [outcome, setOutcome] = useState<Outcome>(initialOutcome);
  const [confidence, setConfidence] = useState(initialOutcome === "YES" ? Math.max(55, market.yesProbability) : Math.max(55, 100 - market.yesProbability));
  const maximumStake = Math.max(1, Math.floor(credits * 0.2));
  const [stake, setStake] = useState(Math.min(10, maximumStake));
  const yesProbability = outcome === "YES" ? confidence : 100 - confidence;
  const potentialReturn = useMemo(() => {
    const crowdSide = outcome === "YES" ? market.yesProbability : 100 - market.yesProbability;
    const multiplier = Math.max(1.05, 100 / Math.max(5, crowdSide));
    return Math.round(stake * multiplier);
  }, [market.yesProbability, outcome, stake]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="forecast-modal-title" aria-modal="true" className="forecast-modal" role="dialog">
        <button aria-label="Close forecast composer" className="modal-close" onClick={onClose} type="button">
          <CloseIcon />
        </button>

        <div className="modal-kicker">Commit a forecast</div>
        <h2 id="forecast-modal-title">{market.question}</h2>
        <p className="modal-rules">{market.rules}</p>

        <div className="outcome-switch" role="group" aria-label="Choose outcome">
          {(["YES", "NO"] as Outcome[]).map((choice) => (
            <button
              aria-pressed={outcome === choice}
              className={outcome === choice ? "active" : ""}
              key={choice}
              onClick={() => {
                setOutcome(choice);
                setConfidence(Math.max(55, choice === "YES" ? market.yesProbability : 100 - market.yesProbability));
              }}
              type="button"
            >
              {choice}
              <span>{choice === "YES" ? market.yesProbability : 100 - market.yesProbability}% crowd</span>
            </button>
          ))}
        </div>

        <label className="range-field">
          <span>
            Your confidence
            <strong>{confidence}%</strong>
          </span>
          <input
            max="99"
            min="50"
            onChange={(event) => setConfidence(Number(event.target.value))}
            type="range"
            value={confidence}
          />
          <span className="range-caption">This records a {yesProbability}% probability of YES.</span>
        </label>

        <div className="stake-field">
          <label htmlFor="stake">Conviction stake</label>
          <div className="stake-input-row">
            <input
              id="stake"
              max={maximumStake}
              min="1"
              onChange={(event) => setStake(Math.min(maximumStake, Math.max(1, Number(event.target.value) || 1)))}
              type="number"
              value={stake}
            />
            <span>CC</span>
            <button onClick={() => setStake(maximumStake)} type="button">MAX {maximumStake}</button>
          </div>
          <div className="stake-meter"><span style={{ width: `${Math.min(100, (stake / maximumStake) * 100)}%` }} /></div>
          <p>You can risk at most 20% of your {credits} available credits.</p>
        </div>

        <div className="forecast-summary">
          <div><span>Recorded probability</span><strong>{yesProbability}% YES</strong></div>
          <div><span>Potential return</span><strong>≈ {potentialReturn} CC</strong></div>
          <div><span>Reputation exposure</span><strong>{confidence >= 80 ? "High" : confidence >= 65 ? "Medium" : "Measured"}</strong></div>
        </div>

        <div className="source-line"><ShieldIcon /> Resolved from {market.sourceLabel} through GenLayer consensus.</div>

        <button
          className="commit-button"
          disabled={busy}
          onClick={() => onSubmit({ outcome, confidence, stake })}
          type="button"
        >
          {busy ? "Recording forecast…" : mode === "contract" ? "Sign & stake on GenLayer" : "Record preview forecast"}
          {!busy && <CheckIcon />}
        </button>
      </section>
    </div>
  );
}
