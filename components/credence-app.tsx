"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketCategory, MarketFeed, SourcedMarket, Viewer } from "../lib/product-data";
import {
  connectCredenceWallet,
  readBindingChallenge,
  readChainIdentity,
  readChainProfile,
  readProtocolStats,
  readUserPositions,
  type BindingChallenge,
  type ChainIdentity,
  type ChainPosition,
  type ChainProfile,
  type ChainProtocolStats,
  type ConnectedCredenceWallet,
} from "../lib/genlayer-client";
import {
  BRADBURY_EXPLORER_URL,
  BRADBURY_FAUCET_URL,
  CREDENCE_CONTRACT_ADDRESS,
  shortAddress,
} from "../lib/deployment";
import { ClockIcon, CloseIcon, MarkIcon, SearchIcon, ShieldIcon } from "./icons";

type Props = {
  viewer: Viewer;
  signedIn: boolean;
  signInPath: string;
};

type Notice = { tone: "good" | "bad" | "plain"; text: string };
type View = "feed" | "record";

const CATEGORIES: Array<"All" | MarketCategory> = [
  "All",
  "Politics",
  "Economy",
  "Sports",
  "Crypto",
  "Technology",
  "Science",
  "Culture",
  "World",
  "Other",
];

function formatDate(value: string | number) {
  const date = typeof value === "number" ? new Date(value * 1_000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function percent(bps: number, empty = "—") {
  return bps ? `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%` : empty;
}

function statusLabel(status: string) {
  if (status === "WON") return "Correct";
  if (status === "LOST") return "Wrong";
  if (status === "VOID") return "Void";
  return "Open";
}

function MarketCard({
  market,
  position,
  onChoose,
}: {
  market: SourcedMarket;
  position?: ChainPosition;
  onChoose: (market: SourcedMarket, prediction: "YES" | "NO") => void;
}) {
  return (
    <article className="market-card">
      <div className="market-meta">
        <span>{market.category}</span>
        <span className="market-time"><ClockIcon /> {formatDate(market.endAt)}</span>
      </div>
      <h3>{market.question}</h3>
      <a className="source-link" href={market.sourceUrl} target="_blank" rel="noreferrer">
        Polymarket source ↗
      </a>
      {position ? (
        <div className="position-stamp">
          <strong>{position.prediction}</strong>
          <span>{Math.round(position.confidenceBps / 100)}% · {position.stake} REP</span>
        </div>
      ) : (
        <div className="choice-row">
          <button className="choice yes" onClick={() => onChoose(market, "YES")}>YES</button>
          <button className="choice no" onClick={() => onChoose(market, "NO")}>NO</button>
        </div>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CredenceApp({ viewer, signedIn, signInPath }: Props) {
  const [feed, setFeed] = useState<MarketFeed | null>(null);
  const [feedError, setFeedError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [view, setView] = useState<View>("feed");
  const [wallet, setWallet] = useState<ConnectedCredenceWallet | null>(null);
  const [profile, setProfile] = useState<ChainProfile | null>(null);
  const [identity, setIdentity] = useState<ChainIdentity | null>(null);
  const [challenge, setChallenge] = useState<BindingChallenge | null>(null);
  const [positions, setPositions] = useState<ChainPosition[]>([]);
  const [protocol, setProtocol] = useState<ChainProtocolStats | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<SourcedMarket | null>(null);
  const [selection, setSelection] = useState<"YES" | "NO">("YES");
  const [confidence, setConfidence] = useState(70);
  const [stake, setStake] = useState(1);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/markets", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as MarketFeed & { error?: string };
        if (!response.ok) throw new Error(body.error || "Market feed unavailable.");
        return body;
      })
      .then(setFeed)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedError(error instanceof Error ? error.message : "Market feed unavailable.");
      });
    readProtocolStats().then(setProtocol).catch(() => setProtocol(null));
    return () => controller.abort();
  }, []);

  const loadWallet = useCallback(async (address: string) => {
    const [nextProfile, nextIdentity, nextChallenge] = await Promise.all([
      readChainProfile(address),
      readChainIdentity(address),
      readBindingChallenge(address),
    ]);
    const nextPositions = nextProfile.predictionsMade
      ? await readUserPositions(address, nextProfile.predictionsMade)
      : [];
    setProfile(nextProfile);
    setIdentity(nextIdentity);
    setChallenge(nextChallenge);
    setPositions(nextPositions);
  }, []);

  const positionByMarket = useMemo(
    () => new Map(positions.map((position) => [position.marketId, position])),
    [positions],
  );

  const visibleMarkets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (feed?.markets ?? []).filter(
      (market) =>
        (category === "All" || market.category === category) &&
        (!needle ||
          market.question.toLowerCase().includes(needle) ||
          market.category.toLowerCase().includes(needle)),
    );
  }, [category, feed, query]);

  const maximumStake = profile?.registered
    ? Math.max(1, Math.floor((profile.availableReputation * (protocol?.maxStakeBps ?? 2_000)) / 10_000))
    : 0;

  async function connectWallet() {
    setBusy("connect");
    setNotice(null);
    try {
      const connected = await connectCredenceWallet();
      setWallet(connected);
      await loadWallet(connected.address);
      setNotice({ tone: "good", text: "Wallet connected." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Could not connect wallet." });
    } finally {
      setBusy("");
    }
  }

  function chooseMarket(market: SourcedMarket, prediction: "YES" | "NO") {
    if (!wallet) {
      setNotice({ tone: "plain", text: "Connect your Bradbury wallet first." });
      return;
    }
    if (!profile?.registered || !identity?.canPredict) {
      setIdentityOpen(true);
      return;
    }
    setSelection(prediction);
    setConfidence(70);
    setStake(1);
    setSelectedMarket(market);
  }

  async function submitPrediction(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet || !selectedMarket || !profile) return;
    if (!Number.isInteger(stake) || stake < 1 || stake > maximumStake) {
      setNotice({ tone: "bad", text: `Stake between 1 and ${maximumStake} REP.` });
      return;
    }
    setBusy("predict");
    setNotice({ tone: "plain", text: "GenLayer validators are checking the source…" });
    try {
      await wallet.makePrediction({
        marketId: selectedMarket.id,
        prediction: selection,
        confidenceBps: confidence * 100,
        stake,
      });
      await loadWallet(wallet.address);
      setSelectedMarket(null);
      setNotice({ tone: "good", text: `${stake} REP now backs ${selection}.` });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Prediction failed." });
    } finally {
      setBusy("");
    }
  }

  async function beginProof() {
    if (!wallet) return;
    setBusy("identity");
    setNotice({ tone: "plain", text: "Creating a fresh verification challenge…" });
    try {
      if (identity?.bound) await wallet.beginXReverification();
      else await wallet.beginXBinding();
      await loadWallet(wallet.address);
      setNotice({ tone: "good", text: "Challenge ready. Post it exactly as shown." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Could not create challenge." });
    } finally {
      setBusy("");
    }
  }

  async function verifyProof(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet || !challenge?.active) return;
    setBusy("identity");
    setNotice({ tone: "plain", text: "Validators are verifying the X post…" });
    try {
      if (challenge.purpose === "REVERIFY") await wallet.verifyXReverification(proofUrl.trim());
      else await wallet.verifyXBinding(proofUrl.trim());
      await loadWallet(wallet.address);
      setProofUrl("");
      setIdentityOpen(false);
      setNotice({ tone: "good", text: challenge.purpose === "REVERIFY" ? "X account reverified." : "X account bound. You have 100 REP." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Verification failed." });
    } finally {
      setBusy("");
    }
  }

  async function resolvePosition(position: ChainPosition) {
    if (!wallet) return;
    setBusy(position.marketId);
    setNotice({ tone: "plain", text: "Validators are checking the final Polymarket result…" });
    try {
      await wallet.resolveMarket(position.marketId);
      await loadWallet(wallet.address);
      setNotice({ tone: "good", text: "Market resolved. Settle your position." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Resolution is not ready." });
    } finally {
      setBusy("");
    }
  }

  async function settlePosition(position: ChainPosition) {
    if (!wallet) return;
    setBusy(position.marketId);
    try {
      await wallet.settlePrediction(position.marketId);
      await loadWallet(wallet.address);
      setNotice({ tone: "good", text: "Your REP and Prediction Score are updated." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Settlement failed." });
    } finally {
      setBusy("");
    }
  }

  async function recover(action: "start" | "claim") {
    if (!wallet) return;
    setBusy("recovery");
    try {
      if (action === "start") await wallet.startRecovery();
      else await wallet.claimRecovery();
      await loadWallet(wallet.address);
      setNotice({ tone: "good", text: action === "start" ? "REP recovery started." : "Recovered REP claimed." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Recovery action failed." });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("feed")} aria-label="Credence home">
          <span className="brand-mark"><MarkIcon /></span>
          CREDENCE
        </button>
        <div className="network-pill"><span /> Polymarket · Bradbury</div>
        <div className="header-actions">
          {signedIn ? (
            <span className="viewer-name">{viewer?.displayName?.split(" ")[0]}</span>
          ) : (
            <a className="quiet-button" href={signInPath}>Sign in</a>
          )}
          {wallet && (
            <button className="quiet-button" onClick={() => setIdentityOpen(true)}>
              <ShieldIcon /> {identity?.bound ? `@${identity.handle}` : "Verify X"}
            </button>
          )}
          <button className="wallet-button" onClick={connectWallet} disabled={Boolean(busy)}>
            {wallet ? shortAddress(wallet.address) : busy === "connect" ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      </header>

      {notice && (
        <button className={`notice notice-${notice.tone}`} onClick={() => setNotice(null)}>
          {notice.text}<span>×</span>
        </button>
      )}

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">REPUTATION FORECASTING</p>
            <h1>Forecast with reputation.</h1>
            <p className="hero-copy">Choose a live question. Back YES or NO with your own REP.</p>
          </div>
          <div className="hero-ledger">
            <Metric label="REP" value={profile?.registered ? profile.reputation : "—"} />
            <Metric label="Prediction Score" value={profile?.resolvedPredictions ? percent(profile.predictionScoreBps) : "—"} />
            <Metric label="Accuracy" value={profile?.resolvedPredictions ? percent(profile.accuracyBps) : "—"} />
            <Metric label="At risk" value={profile?.registered ? profile.reputationAtRisk : "—"} />
          </div>
        </section>

        <nav className="view-tabs" aria-label="Credence views">
          <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>Live questions</button>
          <button className={view === "record" ? "active" : ""} onClick={() => setView("record")}>My record {positions.length ? `(${positions.length})` : ""}</button>
        </nav>

        {view === "feed" ? (
          <section className="feed-section">
            <div className="feed-tools">
              <label className="search-box">
                <SearchIcon />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions" />
              </label>
              <div className="category-row">
                {CATEGORIES.map((item) => (
                  <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
            </div>

            {!feed && !feedError && <div className="empty-state">Loading live questions…</div>}
            {feedError && <div className="empty-state error-state">{feedError}<button onClick={() => window.location.reload()}>Retry</button></div>}
            {feed && !visibleMarkets.length && <div className="empty-state">No matching live questions.</div>}
            <div className="market-grid">
              {visibleMarkets.map((market) => (
                <MarketCard key={market.id} market={market} position={positionByMarket.get(market.id)} onChoose={chooseMarket} />
              ))}
            </div>
            {feed && (
              <p className="feed-footnote">
                Questions from <a href="https://polymarket.com" target="_blank" rel="noreferrer">Polymarket</a>. No money, odds, or pool is copied into Credence.
                {feed.stale ? " Showing the latest cached feed." : ""}
              </p>
            )}
          </section>
        ) : (
          <section className="record-section">
            {!wallet && <div className="empty-state"><h2>Connect your wallet</h2><p>Your onchain prediction record will appear here.</p><button onClick={connectWallet}>Connect wallet</button></div>}
            {wallet && !profile?.registered && <div className="empty-state"><h2>Verify one X account</h2><p>This creates your non-transferable 100 REP identity.</p><button onClick={() => setIdentityOpen(true)}>Verify X</button></div>}
            {profile?.registered && (
              <>
                <div className="record-header">
                  <div><p className="eyebrow">ONCHAIN RECORD</p><h2>{identity?.handle ? `@${identity.handle}` : shortAddress(wallet?.address ?? "")}</h2></div>
                  <div className="record-stats">
                    <Metric label="Resolved" value={profile.resolvedPredictions} />
                    <Metric label="Correct" value={profile.correctPredictions} />
                    <Metric label="Voids" value={profile.voidPredictions} />
                  </div>
                </div>

                {profile.reputation < 20 && profile.openPredictions === 0 && (
                  <div className="recovery-card">
                    <div><strong>REP recovery</strong><span>{profile.recoveryActive ? `Next claim ${formatDate(profile.recoveryNextAt)}` : "Recover slowly toward 100."}</span></div>
                    {!profile.recoveryActive ? (
                      <button disabled={busy === "recovery"} onClick={() => recover("start")}>Start</button>
                    ) : profile.recoverableReputation > 0 ? (
                      <button disabled={busy === "recovery"} onClick={() => recover("claim")}>Claim {profile.recoverableReputation}</button>
                    ) : null}
                  </div>
                )}

                {!positions.length ? (
                  <div className="empty-state"><h2>No predictions yet</h2><button onClick={() => setView("feed")}>Browse questions</button></div>
                ) : (
                  <div className="position-list">
                    {positions.map((position) => {
                      const canResolve = position.status === "OPEN" && position.market.status === "OPEN";
                      const canSettle = position.status === "OPEN" && position.market.status !== "OPEN";
                      return (
                        <article className="position-card" key={position.marketId}>
                          <div className="position-copy">
                            <div className="position-top"><span className={`status status-${position.status.toLowerCase()}`}>{statusLabel(position.status)}</span><a href={position.market.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a></div>
                            <h3>{position.market.question}</h3>
                            <p><strong>{position.prediction}</strong> · {Math.round(position.confidenceBps / 100)}% confidence · {position.stake} REP</p>
                          </div>
                          <div className="position-action">
                            {position.status !== "OPEN" && position.status !== "VOID" && <Metric label="Score" value={percent(position.scoreBps)} />}
                            {canResolve && <button disabled={busy === position.marketId} onClick={() => resolvePosition(position)}>Resolve</button>}
                            {canSettle && <button disabled={busy === position.marketId} onClick={() => settlePosition(position)}>Settle</button>}
                            {position.status === "OPEN" && !canResolve && !canSettle && <span>Ends {formatDate(position.market.endTimeUnix)}</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer>
        <span>Credence · Bradbury testnet</span>
        <div><a href={BRADBURY_FAUCET_URL} target="_blank" rel="noreferrer">Faucet</a><a href={BRADBURY_EXPLORER_URL} target="_blank" rel="noreferrer">Explorer</a><a href={`${BRADBURY_EXPLORER_URL}address/${CREDENCE_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract</a></div>
      </footer>

      {selectedMarket && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMarket(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="prediction-title">
            <button className="modal-close" onClick={() => setSelectedMarket(null)} aria-label="Close"><CloseIcon /></button>
            <p className="eyebrow">BACK YOUR FORECAST</p>
            <h2 id="prediction-title">{selectedMarket.question}</h2>
            <form onSubmit={submitPrediction}>
              <div className="modal-choices">
                <button type="button" className={selection === "YES" ? "active yes" : ""} onClick={() => setSelection("YES")}>YES</button>
                <button type="button" className={selection === "NO" ? "active no" : ""} onClick={() => setSelection("NO")}>NO</button>
              </div>
              <label className="field-label"><span>Confidence <strong>{confidence}%</strong></span><input type="range" min="50" max="95" step="1" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
              <label className="field-label"><span>REP at risk <small>Max {maximumStake}</small></span><input className="number-input" type="number" min="1" max={maximumStake} value={stake} onChange={(event) => setStake(Number(event.target.value))} /></label>
              <div className="settlement-preview"><span>Correct</span><strong>+{stake} REP</strong><span>Wrong</span><strong>−{stake} REP</strong></div>
              <button className="primary-button" disabled={busy === "predict" || maximumStake < 1} type="submit">{busy === "predict" ? "Checking source…" : `Back ${selection} with ${stake} REP`}</button>
            </form>
          </section>
        </div>
      )}

      {identityOpen && wallet && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIdentityOpen(false)}>
          <section className="modal identity-modal" role="dialog" aria-modal="true" aria-labelledby="identity-title">
            <button className="modal-close" onClick={() => setIdentityOpen(false)} aria-label="Close"><CloseIcon /></button>
            <ShieldIcon className="identity-icon" />
            <h2 id="identity-title">X verification</h2>
            {identity?.bound && !identity.reverificationDue && !challenge?.active ? (
              <div className="verified-box"><strong>@{identity.handle}</strong><span>Verified until {formatDate(identity.verifiedUntil)}</span></div>
            ) : challenge?.active ? (
              <form onSubmit={verifyProof}>
                <label className="field-label"><span>Post this exact text</span><textarea readOnly value={challenge.challenge} /></label>
                <div className="inline-actions">
                  <button type="button" onClick={() => navigator.clipboard.writeText(challenge.challenge)}>Copy</button>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(challenge.challenge)}`} target="_blank" rel="noreferrer">Post on X ↗</a>
                </div>
                <label className="field-label"><span>Post URL</span><input className="text-input" required value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://x.com/you/status/…" /></label>
                <button className="primary-button" disabled={busy === "identity"} type="submit">{busy === "identity" ? "Verifying…" : challenge.purpose === "REVERIFY" ? "Reverify" : "Verify and receive 100 REP"}</button>
              </form>
            ) : (
              <div className="identity-start">
                <p>{identity?.bound ? "A fresh post rechecks that you still control the same X account." : "One X account binds to one wallet."}</p>
                <button className="primary-button" disabled={busy === "identity"} onClick={beginProof}>{busy === "identity" ? "Creating…" : identity?.bound ? "Create recheck" : "Create verification"}</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
