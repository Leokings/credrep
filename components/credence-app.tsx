"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppState, Market, Outcome, UserForecast } from "../lib/product-data";
import { ForecastModal } from "./forecast-modal";
import {
  BoltIcon,
  ChartIcon,
  ChevronIcon,
  CompassIcon,
  MarkIcon,
  SearchIcon,
  ShieldIcon,
  TrophyIcon,
  UserIcon,
} from "./icons";
import { MarketCard } from "./market-card";

type Props = {
  initialState: AppState;
  signedIn: boolean;
  signInPath: string;
};

const CATEGORIES = ["All markets", "Football", "Technology", "Economy", "Crypto"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function accuracy(correct: number, resolved: number) {
  return resolved ? Math.round((correct / resolved) * 100) : null;
}

function brierLabel(value: number | null) {
  if (value === null) return "Provisional";
  return (value / 10_000).toFixed(3);
}

export function CredenceApp({ initialState, signedIn, signInPath }: Props) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] = useState("All markets");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState<{ market: Market; outcome: Outcome } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/state", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your saved ledger.");
        return (await response.json()) as AppState;
      })
      .then((nextState) => !cancelled && setState(nextState))
      .catch(() => {
        if (!cancelled) setNotice("The saved ledger is warming up. You can still explore the preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return state.markets.filter((market) => {
      const categoryMatch = activeCategory === "All markets" || market.category === activeCategory;
      const queryMatch =
        !normalizedQuery ||
        market.question.toLowerCase().includes(normalizedQuery) ||
        market.category.toLowerCase().includes(normalizedQuery) ||
        market.sourceLabel.toLowerCase().includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [activeCategory, query, state.markets]);

  const visibleMarkets = showAll ? filteredMarkets : filteredMarkets.slice(0, 4);
  const userForecastByMarket = useMemo(
    () => new Map(state.userForecasts.map((forecast) => [forecast.marketId, forecast])),
    [state.userForecasts],
  );
  const userAccuracy = accuracy(state.profile.correctForecasts, state.profile.resolvedForecasts);

  function openComposer(market: Market, outcome: Outcome) {
    if (!signedIn) {
      window.location.assign(signInPath);
      return;
    }
    setComposer({ market, outcome });
  }

  async function submitForecast(input: { outcome: Outcome; confidence: number; stake: number }) {
    if (!composer) return;
    setBusy(true);
    setNotice(null);
    const forecast: UserForecast = {
      marketId: composer.market.id,
      outcome: input.outcome,
      confidence: input.confidence,
      stake: input.stake,
      status: "OPEN",
    };

    try {
      if (state.ledgerMode === "indexed") {
        const response = await fetch("/api/forecasts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ marketId: composer.market.id, ...input }),
        });
        const result = (await response.json()) as { error?: string; forecast?: UserForecast };
        if (!response.ok) throw new Error(result.error || "Forecast could not be recorded.");
        forecast.status = result.forecast?.status || "OPEN";
      }

      setState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          credits: current.profile.credits - input.stake,
          totalForecasts: current.profile.totalForecasts + 1,
        },
        userForecasts: [forecast, ...current.userForecasts],
        markets: current.markets.map((market) =>
          market.id === composer.market.id
            ? { ...market, volume: market.volume + input.stake, forecasters: market.forecasters + 1 }
            : market,
        ),
      }));
      setComposer(null);
      setNotice(
        state.ledgerMode === "contract"
          ? "Forecast submitted. It will appear as committed after the transaction is accepted."
          : "Forecast recorded in the private preview ledger. Testnet signing comes next.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Forecast could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Credence home">
          <span className="brand-mark"><MarkIcon /></span>
          <span>CREDENCE</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a className="active" href="#markets"><CompassIcon /> Markets</a>
          <a href="#portfolio"><ChartIcon /> Portfolio</a>
          <a href="#leaderboard"><TrophyIcon /> Leaderboard</a>
          <a href="#reputation"><UserIcon /> Profile</a>
        </nav>

        <div className="topbar-actions">
          <label className="search-field">
            <SearchIcon />
            <input aria-label="Search markets" onChange={(event) => setQuery(event.target.value)} placeholder="Search signals" value={query} />
          </label>
          {signedIn ? (
            <div className="user-chip">
              <span className="avatar avatar-self">{initials(state.profile.displayName)}</span>
              <span className="user-chip-copy"><strong>{state.profile.credits} CC</strong><small>{state.profile.handle}</small></span>
              <ChevronIcon />
            </div>
          ) : (
            <a className="sign-in-button" href={signInPath}>Start forecasting</a>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-content">
            <div className="hero-proof"><ShieldIcon /> Consensus-resolved reputation</div>
            <h1>Don&apos;t just have an opinion.<br /><em>Build a track record.</em></h1>
            <p>Forecast what happens next, stake your conviction, and earn a reputation that shows exactly where your judgment holds up.</p>
            <div className="hero-actions">
              <a className="primary-cta" href="#markets">Explore live markets <span>↘</span></a>
              <a className="text-cta" href="#how-it-works">How scoring works</a>
            </div>
          </div>

          <div className="hero-signal-card" aria-label="Live reputation signal">
            <div className="signal-card-header"><span>LIVE SIGNAL</span><span className="pulse-dot" /></div>
            <div className="signal-score-row"><span className="signal-score">{state.profile.overallRating}</span><span className="signal-unit">REP</span></div>
            <div className="signal-chart"><span style={{ height: "26%" }} /><span style={{ height: "42%" }} /><span style={{ height: "35%" }} /><span style={{ height: "60%" }} /><span style={{ height: "54%" }} /><span style={{ height: "76%" }} /><span style={{ height: "89%" }} /></div>
            <div className="signal-card-footer"><span>Your credibility compounds</span><strong>+0.0%</strong></div>
          </div>
        </section>

        <section className="ticker" aria-label="Protocol statistics">
          <span>LIVE MARKETS <strong>{state.markets.length}</strong></span>
          <span>FORECASTERS <strong>12.8K</strong></span>
          <span>CREDITS AT RISK <strong>412K CC</strong></span>
          <span>RESOLVED CLAIMS <strong>34.2K</strong></span>
          <span>CONSENSUS HEALTH <strong className="ticker-green">99.4%</strong></span>
        </section>

        {notice && (
          <div className="notice-bar" role="status"><BoltIcon /> {notice}<button aria-label="Dismiss message" onClick={() => setNotice(null)} type="button">×</button></div>
        )}

        <section className="markets-section" id="markets">
          <div className="section-heading-row">
            <div><span className="section-kicker">THE OPEN FLOOR</span><h2>Where&apos;s your edge?</h2><p>Curated questions with rules frozen before anyone can stake.</p></div>
            <div className="market-filters" role="group" aria-label="Filter markets">
              {CATEGORIES.map((category) => (
                <button className={activeCategory === category ? "active" : ""} key={category} onClick={() => { setActiveCategory(category); setShowAll(false); }} type="button">{category}</button>
              ))}
            </div>
          </div>

          <div className="market-grid">
            {visibleMarkets.map((market, index) => (
              <MarketCard featured={index === 0 && activeCategory === "All markets" && !query} forecast={userForecastByMarket.get(market.id)} key={market.id} market={market} onForecast={openComposer} />
            ))}
          </div>
          {!visibleMarkets.length && <div className="empty-state">No markets match that signal. Try another topic or keyword.</div>}
          {filteredMarkets.length > 4 && (
            <button className="show-more" onClick={() => setShowAll((value) => !value)} type="button">{showAll ? "Show the strongest signals" : `Show ${filteredMarkets.length - 4} more markets`}<ChevronIcon className={showAll ? "rotated" : ""} /></button>
          )}
        </section>

        <section className="reputation-section" id="reputation">
          <div className="reputation-copy">
            <span className="section-kicker section-kicker-light">YOUR RECEIPTS, FOREVER</span>
            <h2>One score can lie.<br /><em>A record can&apos;t.</em></h2>
            <p>Credence separates activity from ability. Your rating grows when your probabilities beat the evidence—and falls when confidence outruns judgment.</p>
            <div className="trust-list"><span><i>01</i> Topic-specific expertise</span><span><i>02</i> Confidence-weighted scoring</span><span><i>03</i> Immutable misses included</span></div>
          </div>

          <div className="profile-card" id="portfolio">
            <div className="profile-card-top">
              <div className="profile-identity"><span className="avatar avatar-large avatar-self">{initials(state.profile.displayName)}</span><div><h3>{state.profile.displayName}</h3><p>{state.profile.handle} · {state.profile.resolvedForecasts < 20 ? "Provisional forecaster" : "Verified forecaster"}</p></div></div>
              <span className="verified-badge"><ShieldIcon /> Verified ledger</span>
            </div>
            <div className="profile-score-grid">
              <div className="profile-score-main"><span>OVERALL REPUTATION</span><strong>{state.profile.overallRating}</strong><small>{state.profile.resolvedForecasts < 20 ? `${20 - state.profile.resolvedForecasts} resolutions to prove` : `Top ${state.profile.rank || 8}%`}</small></div>
              <div><span>ACCURACY</span><strong>{userAccuracy === null ? "—" : `${userAccuracy}%`}</strong><small>{state.profile.resolvedForecasts} resolved</small></div>
              <div><span>BRIER SCORE</span><strong>{brierLabel(state.profile.averageBrier)}</strong><small>Lower is sharper</small></div>
              <div><span>CONVICTION</span><strong>{state.profile.credits}</strong><small>Credits available</small></div>
            </div>
            <div className="topic-ratings">
              <div className="topic-ratings-header"><span>TOPIC REPUTATION</span><span>20 forecasts unlock “proven”</span></div>
              {[["Football", state.profile.resolvedForecasts ? 612 : 500, "6 / 20"], ["Technology", state.profile.resolvedForecasts ? 568 : 500, "3 / 20"], ["Economy", 500, "0 / 20"]].map(([topic, rating, sample]) => (
                <div className="topic-row" key={String(topic)}><span>{topic}</span><div><i style={{ width: `${(Number(rating) - 100) / 8}%` }} /></div><strong>{rating}</strong><small>{sample}</small></div>
              ))}
            </div>
          </div>
        </section>

        <section className="leaderboard-section" id="leaderboard">
          <div className="section-heading-row"><div><span className="section-kicker">PROVEN SIGNAL</span><h2>Forecasters worth following.</h2></div><a className="text-link" href="#markets">Challenge the board ↗</a></div>
          <div className="leaderboard-table" role="table" aria-label="Top forecasters">
            <div className="leaderboard-head" role="row"><span>RANK</span><span>FORECASTER</span><span>STRONGEST EDGE</span><span>ACCURACY</span><span>RESOLVED</span><span>REPUTATION</span></div>
            {state.leaderboard.map((leader, index) => (
              <div className="leaderboard-row" key={leader.userId} role="row"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span className="leader-person"><i className={`avatar avatar-${index + 1}`}>{initials(leader.displayName)}</i><span><strong>{leader.displayName}</strong><small>{leader.handle}</small></span></span><span><span className="topic-pill">{leader.category}</span></span><strong>{leader.accuracy}%</strong><span>{leader.resolved}</span><span className="leader-rating"><strong>{leader.rating}</strong><small className={leader.delta >= 0 ? "signal-up" : "signal-down"}>{leader.delta >= 0 ? "+" : ""}{leader.delta}</small></span></div>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><span className="section-kicker">THE MECHANISM</span><h2>Simple to play.<br />Hard to fake.</h2></div>
          <div className="how-steps">
            <article><span>01</span><BoltIcon /><h3>Start with 100 CC</h3><p>Every verified profile gets one non-transferable starting balance. No buying credibility.</p></article>
            <article><span>02</span><ChartIcon /><h3>State your probability</h3><p>Choose YES or NO, record 50–99% confidence, and risk up to 20% of your balance.</p></article>
            <article><span>03</span><ShieldIcon /><h3>Consensus resolves</h3><p>GenLayer validators apply the frozen rules to the approved public evidence.</p></article>
            <article><span>04</span><TrophyIcon /><h3>Your record compounds</h3><p>Correct, calibrated forecasts build category reputation. Confident misses remain visible.</p></article>
          </div>
        </section>

        <section className="closing-cta"><div><span className="section-kicker section-kicker-light">KNOW SOMETHING?</span><h2>Put your reputation<br />where your mouth is.</h2></div><a className="closing-button" href="#markets">Find your market <span>↗</span></a></section>
      </main>

      <footer className="site-footer"><a className="brand brand-footer" href="#top"><span className="brand-mark"><MarkIcon /></span><span>CREDENCE</span></a><p>Forecasting reputation, settled by consensus.</p><div><a href="#markets">Markets</a><a href="#reputation">Methodology</a><a href="#how-it-works">How it works</a></div><span>Built on GenLayer · Preview ledger</span></footer>

      {composer && <ForecastModal busy={busy} credits={state.profile.credits} initialOutcome={composer.outcome} market={composer.market} mode={state.ledgerMode} onClose={() => !busy && setComposer(null)} onSubmit={submitForecast} />}
    </div>
  );
}
