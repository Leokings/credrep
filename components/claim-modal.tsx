"use client";

import { useMemo, useState } from "react";
import type { ClaimInput } from "../lib/product-data";
import { CheckIcon, CloseIcon, ShieldIcon } from "./icons";

type Props = {
  reputation: number;
  availableReputation: number;
  mode: "preview" | "indexed" | "contract";
  busy: boolean;
  onClose: () => void;
  onSubmit: (claim: ClaimInput) => Promise<void>;
};

const CATEGORIES = [
  "Economy",
  "Football",
  "Technology",
  "Crypto",
  "Politics",
  "Science",
  "Other",
];

function defaultResolution() {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function ClaimModal({
  reputation,
  availableReputation,
  mode,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const [statement, setStatement] = useState("");
  const [category, setCategory] = useState("Economy");
  const [stake, setStake] = useState(1);
  const [resolutionAt, setResolutionAt] = useState(defaultResolution);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rules, setRules] = useState("");
  const maximumStake = Math.max(1, Math.floor(availableReputation * 0.2));
  const result = useMemo(
    () => ({
      afterStake: availableReputation - stake,
      ifTrue: reputation + stake,
      ifFalse: reputation - stake,
    }),
    [availableReputation, reputation, stake],
  );
  const valid =
    statement.trim().length >= 20 &&
    sourceLabel.trim().length >= 3 &&
    sourceUrl.trim().startsWith("https://") &&
    rules.trim().length >= 20;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="claim-modal-title" aria-modal="true" className="forecast-modal claim-modal" role="dialog">
        <button aria-label="Close claim composer" className="modal-close" onClick={onClose} type="button">
          <CloseIcon />
        </button>

        <div className="modal-kicker">Your word. Your reputation.</div>
        <h2 id="claim-modal-title">Make a public claim</h2>
        <p className="modal-rules">Write one clear future statement. You are backing it alone—there is no opposing side and no shared pool.</p>

        <div className="claim-form">
          <label className="claim-form-wide">
            <span>Your claim</span>
            <textarea
              maxLength={280}
              onChange={(event) => setStatement(event.target.value)}
              placeholder="The Federal Reserve will cut its target range at the September meeting."
              rows={3}
              value={statement}
            />
            <small>{statement.length}/280 · phrase it so TRUE or FALSE can be proven</small>
          </label>

          <label>
            <span>Category</span>
            <select onChange={(event) => setCategory(event.target.value)} value={category}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Resolution time</span>
            <input onChange={(event) => setResolutionAt(event.target.value)} type="datetime-local" value={resolutionAt} />
          </label>

          <label>
            <span>Evidence source name</span>
            <input onChange={(event) => setSourceLabel(event.target.value)} placeholder="Federal Reserve statement" value={sourceLabel} />
          </label>
          <label>
            <span>Evidence URL</span>
            <input onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." type="url" value={sourceUrl} />
          </label>

          <label className="claim-form-wide">
            <span>Frozen resolution rule</span>
            <textarea
              maxLength={1000}
              onChange={(event) => setRules(event.target.value)}
              placeholder="TRUE requires either bound of the announced target range to be lower than immediately before the meeting."
              rows={3}
              value={rules}
            />
          </label>
        </div>

        <div className="stake-field">
          <label htmlFor="stake">Your reputation at risk</label>
          <div className="stake-input-row">
            <input
              id="stake"
              max={maximumStake}
              min="1"
              onChange={(event) => setStake(Math.min(maximumStake, Math.max(1, Number(event.target.value) || 1)))}
              type="number"
              value={stake}
            />
            <span>REP</span>
            <button onClick={() => setStake(maximumStake)} type="button">MAX {maximumStake}</button>
          </div>
          <div className="stake-meter"><span style={{ width: `${Math.min(100, (stake / maximumStake) * 100)}%` }} /></div>
          <p>{availableReputation} REP available. This claim locks {stake}, leaving {result.afterStake} available.</p>
        </div>

        <div className="forecast-summary claim-summary">
          <div><span>If TRUE</span><strong>{stake * 2} returned → {result.ifTrue} REP</strong></div>
          <div><span>If FALSE</span><strong>0 returned → {result.ifFalse} REP</strong></div>
          <div><span>Counterparty</span><strong>None</strong></div>
        </div>

        <div className="source-line"><ShieldIcon /> GenLayer validators resolve only from your frozen rule and approved source.</div>

        <button
          className="commit-button"
          disabled={busy || !valid}
          onClick={() => onSubmit({
            statement: statement.trim(),
            category,
            stake,
            resolutionAt: new Date(resolutionAt).toISOString(),
            sourceLabel: sourceLabel.trim(),
            sourceUrl: sourceUrl.trim(),
            rules: rules.trim(),
          })}
          type="button"
        >
          {busy ? "Recording claim…" : mode === "contract" ? `Sign and risk ${stake} REP` : `Put ${stake} REP behind this`}
          {!busy && <CheckIcon />}
        </button>
      </section>
    </div>
  );
}
