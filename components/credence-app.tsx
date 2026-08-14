"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppState, Claim, ClaimInput } from "../lib/product-data";
import {
  connectCredenceWallet,
  readBindingChallenge,
  readChainClaims,
  readChainIdentity,
  readChainProfile,
  readProtocolStats,
  type BindingChallenge,
  type ChainClaim,
  type ChainIdentity,
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
import { ClaimCard } from "./claim-card";
import { ClaimModal } from "./claim-modal";
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

type Props = {
  initialState: AppState;
  signedIn: boolean;
  signInPath: string;
};

const CATEGORIES = ["All claims", "Football", "Technology", "Economy", "Crypto"];

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

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function sourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Frozen source";
  }
}

function formatUnixDate(value: number) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value * 1_000));
}

function productClaim(
  claim: ChainClaim,
  walletAddress?: string,
  displayName?: string,
  handle?: string,
): Claim {
  const isOwner =
    Boolean(walletAddress) &&
    claim.owner.toLowerCase() === walletAddress?.toLowerCase();
  const firstSource = claim.sources[0] || BRADBURY_EXPLORER_URL;
  return {
    id: `chain-${claim.id}`,
    contractClaimId: claim.id,
    ownerAddress: claim.owner,
    ownerId: claim.owner.toLowerCase(),
    ownerName: isOwner && displayName ? displayName : shortAddress(claim.owner),
    ownerHandle: isOwner && handle ? handle : `@${claim.owner.slice(2, 10)}`,
    statement: claim.statement,
    category: titleCase(claim.category),
    status: claim.status,
    stake: claim.stake,
    resolutionAt: new Date(claim.resolveTimeUnix * 1_000).toISOString(),
    sourceLabel: sourceLabel(firstSource),
    sourceUrl: firstSource,
    rules: claim.resolutionRules,
    createdAt: claim.createdAt,
    outcome: claim.outcome,
  };
}

export function CredenceApp({ initialState, signedIn, signInPath }: Props) {
  const [state, setState] = useState(initialState);
  const [activeCategory, setActiveCategory] = useState("All claims");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [wallet, setWallet] = useState<ConnectedCredenceWallet | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [chainProfile, setChainProfile] = useState<ChainProfile | null>(null);
  const [chainIdentity, setChainIdentity] = useState<ChainIdentity | null>(null);
  const [bindingChallenge, setBindingChallenge] = useState<BindingChallenge | null>(null);
  const [chainClaims, setChainClaims] = useState<Claim[]>([]);
  const [chainStats, setChainStats] = useState<ChainProtocolStats | null>(null);
  const [chainAvailable, setChainAvailable] = useState<boolean | null>(null);
  const [xProofOpen, setXProofOpen] = useState(false);
  const [xProofMode, setXProofMode] = useState<"bind" | "replace">("bind");
  const [xProofUrl, setXProofUrl] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/state", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your reputation ledger.");
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

  useEffect(() => {
    let cancelled = false;
    Promise.all([readProtocolStats(), readChainClaims()])
      .then(([stats, claims]) => {
        if (cancelled) return;
        setChainStats(stats);
        setChainClaims(claims.map((claim) => productClaim(claim)));
        setChainAvailable(true);
      })
      .catch(() => {
        if (!cancelled) setChainAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = useMemo(
    () =>
      chainProfile?.registered
        ? {
            ...state.profile,
            reputation: chainProfile.reputation,
            availableReputation: chainProfile.availableReputation,
            reputationAtRisk: chainProfile.reputationAtRisk,
            totalClaims: chainProfile.claimsMade,
            resolvedClaims: chainProfile.resolvedClaims,
            correctClaims: chainProfile.correctClaims,
          }
        : state.profile,
    [chainProfile, state.profile],
  );
  const ledgerMode = chainProfile?.registered ? "contract" : state.ledgerMode;
  const claims = useMemo(() => {
    const onChainIds = new Set(
      chainClaims.map((claim) => claim.contractClaimId).filter(Boolean),
    );
    return [
      ...chainClaims,
      ...state.claims.filter(
        (claim) =>
          !claim.contractClaimId || !onChainIds.has(claim.contractClaimId),
      ),
    ];
  }, [chainClaims, state.claims]);

  const filteredClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return claims.filter((claim) => {
      const categoryMatch = activeCategory === "All claims" || claim.category === activeCategory;
      const queryMatch =
        !normalizedQuery ||
        claim.statement.toLowerCase().includes(normalizedQuery) ||
        claim.category.toLowerCase().includes(normalizedQuery) ||
        claim.ownerName.toLowerCase().includes(normalizedQuery) ||
        claim.sourceLabel.toLowerCase().includes(normalizedQuery);
      return categoryMatch && queryMatch;
    });
  }, [activeCategory, claims, query]);

  const visibleClaims = showAll ? filteredClaims : filteredClaims.slice(0, 4);
  const userClaims = useMemo(
    () =>
      claims.filter(
        (claim) =>
          claim.ownerId === profile.userId ||
          (wallet &&
            claim.ownerAddress?.toLowerCase() === wallet.address.toLowerCase()),
      ),
    [claims, profile.userId, wallet],
  );
  const userAccuracy = accuracy(profile.correctClaims, profile.resolvedClaims);
  const topicStats = useMemo(
    () => ["Economy", "Football", "Technology"].map((topic) => {
      const matching = userClaims.filter((claim) => claim.category === topic);
      return {
        topic,
        claims: matching.length,
        atRisk: matching
          .filter((claim) => claim.status === "OPEN")
          .reduce((sum, claim) => sum + claim.stake, 0),
      };
    }),
    [userClaims],
  );

  const activeXHandle = chainProfile?.xHandle
    ? `@${chainProfile.xHandle}`
    : profile.handle;
  const proofChallenge =
    xProofMode === "replace"
      ? chainIdentity?.challenge || ""
      : bindingChallenge?.challenge || "";
  const xPostIntent = proofChallenge
    ? `https://x.com/intent/post?text=${encodeURIComponent(proofChallenge)}`
    : "https://x.com/compose/post";

  async function refreshWalletState(address: string) {
    const [nextProfile, nextIdentity, nextChallenge, nextStats] = await Promise.all([
      readChainProfile(address),
      readChainIdentity(address),
      readBindingChallenge(address),
      readProtocolStats(),
    ]);
    setChainProfile(nextProfile);
    setChainIdentity(nextIdentity);
    setBindingChallenge(nextChallenge);
    setChainStats(nextStats);
    return { nextProfile, nextIdentity, nextChallenge };
  }

  function openComposer() {
    if (!signedIn) {
      window.location.assign(signInPath);
      return;
    }
    if (!wallet) {
      setNotice("Connect a wallet to make an on-chain personal claim on Bradbury.");
      return;
    }
    if (!chainProfile?.registered) {
      setNotice("Verify this wallet with one public X post before making a claim.");
      return;
    }
    if (!chainIdentity?.canClaim) {
      setNotice("Your X verification is stale. Recheck it before making a new claim.");
      return;
    }
    if (
      chainProfile.recoveryActive &&
      !window.confirm(
        "Making a claim ends your current recovery. Continue and put reputation at risk?",
      )
    ) return;
    setComposerOpen(true);
  }

  async function handleWalletAction() {
    if (walletBusy || !signedIn) return;
    setWalletBusy(true);
    setNotice(null);
    try {
      if (!wallet) {
        const connected = await connectCredenceWallet();
        const [{ nextProfile, nextIdentity, nextChallenge }, rawClaims] = await Promise.all([
          refreshWalletState(connected.address),
          readChainClaims(),
        ]);
        setWallet(connected);
        setChainClaims(
          rawClaims.map((claim) =>
            productClaim(
              claim,
              connected.address,
              state.profile.displayName,
              nextProfile.xHandle ? `@${nextProfile.xHandle}` : state.profile.handle,
            ),
          ),
        );
        setChainAvailable(true);
        setNotice(
          nextProfile.registered
            ? `Wallet ${shortAddress(connected.address)} connected as @${nextProfile.xHandle}.`
            : nextChallenge.active
              ? "Wallet connected. Finish the pending X proof to unlock 100 REP."
              : "Wallet connected. Verify one X account to unlock 100 non-transferable REP.",
        );
        if (!nextProfile.registered && nextChallenge.active) {
          setXProofMode("bind");
          setXProofOpen(true);
        } else if (nextIdentity.status === "STALE") {
          setNotice("Wallet connected. Your monthly X verification needs a recheck.");
        }
      } else if (!chainProfile?.registered) {
        if (!bindingChallenge?.active) {
          await wallet.beginXBinding();
          await refreshWalletState(wallet.address);
        }
        setXProofMode("bind");
        setXProofOpen(true);
        setNotice("Post the exact challenge on X, then paste that post's URL here.");
      } else {
        setNotice(
          `Wallet ${shortAddress(wallet.address)} is connected as @${chainProfile.xHandle}.`,
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The wallet action did not complete.");
    } finally {
      setWalletBusy(false);
    }
  }

  async function submitXProof() {
    if (!wallet || !proofChallenge || walletBusy) return;
    const proofUrl = xProofUrl.trim();
    if (!/^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/\d+\/?$/i.test(proofUrl)) {
      setNotice("Paste the full public X post URL, ending in /status/ and its numeric post ID.");
      return;
    }

    setWalletBusy(true);
    setNotice(null);
    try {
      if (xProofMode === "replace") {
        await wallet.replaceXProof(proofUrl.replace(/\/$/, ""));
      } else {
        await wallet.verifyXBinding(proofUrl.replace(/\/$/, ""));
      }
      const { nextProfile } = await refreshWalletState(wallet.address);
      setXProofOpen(false);
      setXProofUrl("");
      setNotice(
        xProofMode === "replace"
          ? `New proof accepted. @${nextProfile.xHandle} is verified for another 30 days.`
          : `@${nextProfile.xHandle} is bound to this wallet. Your 100 REP is ready.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "GenLayer could not verify that X post.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleIdentityRefresh() {
    if (!wallet || walletBusy) return;
    setWalletBusy(true);
    setNotice(null);
    try {
      await wallet.refreshXIdentity();
      const { nextProfile } = await refreshWalletState(wallet.address);
      setNotice(`@${nextProfile.xHandle} is verified for another 30 days.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `${error.message} If the old post was removed, publish the same challenge again and use “New proof”.`
          : "The monthly X recheck did not complete.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  function openReplacementProof() {
    if (!chainIdentity?.challenge) {
      setNotice("The original identity challenge is not available.");
      return;
    }
    setXProofMode("replace");
    setXProofUrl("");
    setXProofOpen(true);
  }

  async function handleRecoveryAction() {
    if (!wallet || !chainProfile || walletBusy) return;
    setWalletBusy(true);
    setNotice(null);
    try {
      if (chainProfile.recoveryActive) {
        await wallet.claimRecovery();
      } else {
        await wallet.startRecovery();
      }
      const { nextProfile } = await refreshWalletState(wallet.address);
      setNotice(
        nextProfile.recoveryActive
          ? nextProfile.recoverableReputation > 0
            ? `${nextProfile.recoverableReputation} recovery REP is ready to claim.`
            : `Recovery is active. The next point unlocks ${formatUnixDate(nextProfile.recoveryNextAt)}.`
          : "Recovery brought your balance back to 100 REP.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The recovery action did not complete.");
    } finally {
      setWalletBusy(false);
    }
  }

  async function copyProofChallenge() {
    if (!proofChallenge) return;
    try {
      await navigator.clipboard.writeText(proofChallenge);
      setNotice("Challenge copied. Post it by itself so GenLayer can verify it exactly.");
    } catch {
      setNotice("Select and copy the challenge, then post it by itself on X.");
    }
  }

  async function submitClaim(input: ClaimInput) {
    setBusy(true);
    setNotice(null);
    let claim: Claim = {
      id: `preview-${Date.now()}`,
      ownerId: profile.userId,
      ownerName: profile.displayName,
      ownerHandle: activeXHandle,
      statement: input.statement,
      category: input.category,
      status: "OPEN",
      stake: input.stake,
      resolutionAt: input.resolutionAt,
      sourceLabel: input.sourceLabel,
      sourceUrl: input.sourceUrl,
      rules: input.rules,
      createdAt: new Date().toISOString(),
      outcome: null,
    };

    try {
      if (ledgerMode === "contract") {
        if (!wallet || !chainProfile?.registered || !chainIdentity?.canClaim) {
          throw new Error("Connect a currently verified X-linked wallet before making a claim.");
        }
        const result = await wallet.makeClaim(input);
        claim = {
          ...claim,
          id: `chain-${result.claimId}`,
          contractClaimId: result.claimId,
          transactionHash: result.transactionHash,
          ownerAddress: wallet.address,
          ownerId: wallet.address.toLowerCase(),
        };
        const [nextProfile, nextStats] = await Promise.all([
          readChainProfile(wallet.address),
          readProtocolStats(),
        ]);
        setChainProfile(nextProfile);
        setChainStats(nextStats);
        setChainClaims((current) => [claim, ...current]);
      } else if (state.ledgerMode === "indexed") {
        const response = await fetch("/api/claims", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const result = (await response.json()) as { error?: string; claim?: Claim };
        if (!response.ok || !result.claim) {
          throw new Error(result.error || "Your claim could not be recorded.");
        }
        claim = result.claim;
      }

      if (ledgerMode !== "contract") {
        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            availableReputation: current.profile.availableReputation - input.stake,
            reputationAtRisk: current.profile.reputationAtRisk + input.stake,
            totalClaims: current.profile.totalClaims + 1,
          },
          claims: [claim, ...current.claims],
        }));
      }
      setComposerOpen(false);
      setNotice(
        ledgerMode === "contract"
          ? "Your claim reached GenLayer consensus. Your REP is now locked behind your word."
          : `${input.stake} REP is now locked behind your claim. TRUE returns ${input.stake * 2}; FALSE returns zero.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your claim could not be recorded.");
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
          <a className="active" href="#claims"><CompassIcon /> Claims</a>
          <a href="#record"><ChartIcon /> My record</a>
          <a href="#leaderboard"><TrophyIcon /> Leaderboard</a>
          <a href="#reputation"><UserIcon /> Profile</a>
        </nav>

        <div className="topbar-actions">
          <label className="search-field">
            <SearchIcon />
            <input aria-label="Search claims" onChange={(event) => setQuery(event.target.value)} placeholder="Search claims" value={query} />
          </label>
          {signedIn ? (
            <>
              <button
                className={`wallet-button ${chainProfile?.registered ? "wallet-button-ready" : ""}`}
                disabled={walletBusy}
                onClick={handleWalletAction}
                type="button"
              >
                <ShieldIcon />
                {walletBusy
                  ? "Waiting for wallet…"
                  : !wallet
                    ? "Connect wallet"
                    : !chainProfile?.registered
                      ? bindingChallenge?.active
                        ? "Finish X proof"
                        : "Verify with X"
                      : chainProfile.xHandle
                        ? `@${chainProfile.xHandle}`
                        : shortAddress(wallet.address)}
              </button>
              <div className="user-chip">
                <span className="avatar avatar-self">{initials(profile.displayName)}</span>
                <span className="user-chip-copy"><strong>{profile.reputation} REP</strong><small>{profile.reputationAtRisk} at risk</small></span>
                <ChevronIcon />
              </div>
            </>
          ) : (
            <a className="sign-in-button" href={signInPath}>Start with 100 REP</a>
          )}
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-content">
            <div className="hero-proof"><ShieldIcon /> One person. One claim. Their reputation.</div>
            <h1>Say what will happen.<br /><em>Put your reputation on it.</em></h1>
            <p>Bind one public X account to one wallet and start with 100 reputation points. Back your own claim: if it is true, your stake returns doubled; if it is false, those points are gone.</p>
            <div className="hero-actions">
              <button className="primary-cta" onClick={openComposer} type="button">Make your claim <span>↘</span></button>
              <a className="text-cta" href="#how-it-works">See the exact math</a>
            </div>
            <div className="chain-status" aria-label="Bradbury contract status">
              <span className={`chain-status-dot ${chainAvailable === false ? "chain-status-dot-error" : ""}`} />
              <span>
                <strong>{chainAvailable === false ? "Bradbury read unavailable" : "Bradbury contract live"}</strong>
                <a href={BRADBURY_EXPLORER_URL} rel="noreferrer" target="_blank" title={CREDENCE_CONTRACT_ADDRESS}>
                  {shortAddress(CREDENCE_CONTRACT_ADDRESS)} ↗
                </a>
              </span>
              <small>
                {chainStats ? `${chainStats.users} user${chainStats.users === 1 ? "" : "s"} · ${chainStats.claims} on-chain claims` : "Checking contract…"}
              </small>
              <a href={BRADBURY_FAUCET_URL} rel="noreferrer" target="_blank">Bradbury faucet ↗</a>
            </div>
          </div>

          <div className="hero-signal-card" aria-label="Your reputation balance">
            <div className="signal-card-header"><span>YOUR REPUTATION</span><span className="pulse-dot" /></div>
            <div className="signal-score-row"><span className="signal-score">{profile.reputation}</span><span className="signal-unit">REP</span></div>
            <div className="signal-chart"><span style={{ height: "26%" }} /><span style={{ height: "42%" }} /><span style={{ height: "35%" }} /><span style={{ height: "60%" }} /><span style={{ height: "54%" }} /><span style={{ height: "76%" }} /><span style={{ height: "89%" }} /></div>
            <div className="signal-card-footer"><span>{profile.availableReputation} available</span><strong>{profile.reputationAtRisk} at risk</strong></div>
          </div>
        </section>

        <section className="ticker" aria-label="Credence rules">
          <span>VERIFIED START <strong>100 REP</strong></span>
          <span>CORRECT CLAIM <strong>2× STAKE BACK</strong></span>
          <span>WRONG CLAIM <strong>STAKE BURNED</strong></span>
          <span>BELOW 20 <strong>RECOVER TO 100</strong></span>
          <span>TRUTH LAYER <strong className="ticker-green">GENLAYER</strong></span>
        </section>

        {notice && (
          <div className="notice-bar" role="status"><BoltIcon /> {notice}<button aria-label="Dismiss message" onClick={() => setNotice(null)} type="button">×</button></div>
        )}

        <section className="markets-section" id="claims">
          <div className="section-heading-row">
            <div><span className="section-kicker">PUBLIC COMMITMENTS</span><h2>People backing their word.</h2><p>Each card belongs to one person risking only their own non-transferable reputation.</p></div>
            <div className="claim-heading-actions">
              <div className="market-filters" role="group" aria-label="Filter claims">
                {CATEGORIES.map((category) => (
                  <button className={activeCategory === category ? "active" : ""} key={category} onClick={() => { setActiveCategory(category); setShowAll(false); }} type="button">{category}</button>
                ))}
              </div>
              <button className="make-claim-button" onClick={openComposer} type="button">+ Make a claim</button>
            </div>
          </div>

          <div className="market-grid">
            {visibleClaims.map((claim, index) => (
              <ClaimCard
                claim={claim}
                featured={index === 0 && activeCategory === "All claims" && !query}
                isOwner={
                  claim.ownerId === profile.userId ||
                  Boolean(wallet && claim.ownerAddress?.toLowerCase() === wallet.address.toLowerCase())
                }
                key={claim.id}
              />
            ))}
          </div>
          {!visibleClaims.length && <div className="empty-state">No claims match that signal. Try another topic or keyword.</div>}
          {filteredClaims.length > 4 && (
            <button className="show-more" onClick={() => setShowAll((value) => !value)} type="button">{showAll ? "Show the latest claims" : `Show ${filteredClaims.length - 4} more claims`}<ChevronIcon className={showAll ? "rotated" : ""} /></button>
          )}
        </section>

        <section className="reputation-section" id="reputation">
          <div className="reputation-copy">
            <span className="section-kicker section-kicker-light">YOUR WORD HAS WEIGHT</span>
            <h2>No odds. No pool.<br /><em>Just your record.</em></h2>
            <p>Your reputation is a single visible balance. Correct claims add the amount you risked. Wrong claims permanently remove it. Below 20, a claim-free account can slowly recover to 100—but only a win can go higher.</p>
            <div className="trust-list"><span><i>01</i> One X account per wallet</span><span><i>02</i> Non-transferable points</span><span><i>03</i> Immutable wins and misses</span></div>
          </div>

          <div className="profile-card" id="record">
            <div className="profile-card-top">
              <div className="profile-identity"><span className="avatar avatar-large avatar-self">{initials(profile.displayName)}</span><div><h3>{profile.displayName}</h3><p>{activeXHandle} · {profile.resolvedClaims < 10 ? "Building a record" : "Proven claimant"}</p></div></div>
              <span className="verified-badge"><ShieldIcon /> {chainIdentity?.bound ? `X ${chainIdentity.status.toLowerCase()}` : ledgerMode === "contract" ? "Bradbury on-chain" : "Preview ledger"}</span>
            </div>
            <div className="profile-score-grid">
              <div className="profile-score-main"><span>REPUTATION</span><strong>{profile.reputation}</strong><small>{profile.reputation - 100 >= 0 ? "+" : ""}{profile.reputation - 100} from start</small></div>
              <div><span>AVAILABLE</span><strong>{profile.availableReputation}</strong><small>Ready to back claims</small></div>
              <div><span>AT RISK</span><strong>{profile.reputationAtRisk}</strong><small>Locked in open claims</small></div>
              <div><span>ACCURACY</span><strong>{userAccuracy === null ? "—" : `${userAccuracy}%`}</strong><small>{profile.resolvedClaims} resolved</small></div>
            </div>
            {signedIn && (
              <div className="identity-recovery-grid">
                <section className="identity-control" aria-label="X identity verification">
                  <div className="identity-control-heading">
                    <span className={`identity-state identity-state-${(chainIdentity?.status || "unbound").toLowerCase()}`}>
                      <i /> {chainIdentity?.status || "NOT CONNECTED"}
                    </span>
                    {chainIdentity?.verifiedUntil ? <small>Recheck by {formatUnixDate(chainIdentity.verifiedUntil)}</small> : <small>One X account · one wallet</small>}
                  </div>
                  <strong>{chainIdentity?.bound ? `@${chainIdentity.handle}` : wallet ? "X proof required" : "Connect a wallet to begin"}</strong>
                  <p>GenLayer reads a public challenge post and binds the X account’s stable ID. The same X account cannot activate another wallet.</p>
                  <div className="identity-actions">
                    {!wallet || !chainProfile?.registered ? (
                      <button disabled={walletBusy} onClick={handleWalletAction} type="button">
                        {!wallet ? "Connect wallet" : bindingChallenge?.active ? "Finish X proof" : "Verify with X"}
                      </button>
                    ) : (
                      <>
                        {(chainIdentity?.refreshDue || chainIdentity?.status === "GRACE" || chainIdentity?.status === "STALE") && (
                          <button disabled={walletBusy} onClick={handleIdentityRefresh} type="button">Recheck X</button>
                        )}
                        <button className="identity-action-secondary" disabled={walletBusy} onClick={openReplacementProof} type="button">New proof</button>
                        {chainIdentity?.proofUrl && <a href={chainIdentity.proofUrl} rel="noreferrer" target="_blank">View proof ↗</a>}
                      </>
                    )}
                  </div>
                </section>
                <section className="recovery-control" aria-label="Reputation recovery">
                  <div className="recovery-control-heading"><span>SAFETY FLOOR</span><small>Never above 100</small></div>
                  <strong>{chainProfile?.recoveryActive ? `${chainProfile.recoverableReputation} REP ready` : profile.reputation < 20 ? "Recovery available" : "Unlocks below 20 REP"}</strong>
                  <p>{chainProfile?.recoveryActive ? `Recovery is active. One point unlocks each day; the next checkpoint is ${formatUnixDate(chainProfile.recoveryNextAt)}.` : "With no open claims, wait seven days, then recover one REP per day. Making a new claim ends recovery."}</p>
                  {wallet && chainProfile && (chainProfile.recoveryActive || (chainProfile.reputation < 20 && chainProfile.openClaims === 0)) && (
                    <button
                      disabled={walletBusy || (chainProfile.recoveryActive && chainProfile.recoverableReputation < 1) || !chainIdentity?.canClaim}
                      onClick={handleRecoveryAction}
                      type="button"
                    >
                      {chainProfile.recoveryActive ? chainProfile.recoverableReputation > 0 ? `Claim ${chainProfile.recoverableReputation} REP` : `Next point ${formatUnixDate(chainProfile.recoveryNextAt)}` : "Start 7-day recovery"}
                    </button>
                  )}
                </section>
              </div>
            )}
            <div className="topic-ratings">
              <div className="topic-ratings-header"><span>YOUR CLAIM RECORD</span><span>{profile.totalClaims} total claims</span></div>
              {topicStats.map(({ topic, claims, atRisk }) => (
                <div className="topic-row" key={topic}><span>{topic}</span><div><i style={{ width: `${Math.min(100, claims * 20)}%` }} /></div><strong>{atRisk} REP</strong><small>{claims} claims</small></div>
              ))}
            </div>
          </div>
        </section>

        <section className="leaderboard-section" id="leaderboard">
          <div className="section-heading-row"><div><span className="section-kicker">PROVEN WORD</span><h2>People whose claims hold up.</h2></div><button className="text-link link-button" onClick={openComposer} type="button">Put your name on one ↗</button></div>
          <div className="leaderboard-table" role="table" aria-label="Top reputation holders">
            <div className="leaderboard-head" role="row"><span>RANK</span><span>PERSON</span><span>STRONGEST TOPIC</span><span>ACCURACY</span><span>RESOLVED</span><span>REPUTATION</span></div>
            {state.leaderboard.map((leader, index) => (
              <div className="leaderboard-row" key={leader.userId} role="row"><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span className="leader-person"><i className={`avatar avatar-${index + 1}`}>{initials(leader.displayName)}</i><span><strong>{leader.displayName}</strong><small>{leader.handle}</small></span></span><span><span className="topic-pill">{leader.category}</span></span><strong>{leader.accuracy}%</strong><span>{leader.resolved}</span><span className="leader-rating"><strong>{leader.reputation}</strong><small className="signal-up">+{leader.delta}</small></span></div>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><span className="section-kicker">THE EXACT MECHANISM</span><h2>One claim.<br />Three outcomes.</h2></div>
          <div className="how-steps">
            <article><span>01</span><BoltIcon /><h3>Verify one X account</h3><p>Post your wallet’s exact challenge. GenLayer binds that X identity once and unlocks 100 non-transferable REP.</p></article>
            <article><span>02</span><ChartIcon /><h3>Back your own claim</h3><p>Write a future statement, freeze its rule and source, then put at least one of your points behind it.</p></article>
            <article><span>03</span><ShieldIcon /><h3>GenLayer checks truth</h3><p>Independent validators resolve your statement TRUE, FALSE, or VOID from the approved evidence.</p></article>
            <article><span>04</span><TrophyIcon /><h3>Win beyond 100</h3><p>From 100, risking 1 ends at 101 if TRUE or 99 if FALSE. Below 20, recovery can rebuild only to 100.</p></article>
          </div>
        </section>

        <section className="closing-cta"><div><span className="section-kicker section-kicker-light">WILL YOU STAND BY IT?</span><h2>Put your reputation<br />behind your word.</h2></div><button className="closing-button" onClick={openComposer} type="button">Make your claim <span>↗</span></button></section>
      </main>

      <footer className="site-footer"><a className="brand brand-footer" href="#top"><span className="brand-mark"><MarkIcon /></span><span>CREDENCE</span></a><p>Personal reputation claims, settled by consensus.</p><div><a href="#claims">Claims</a><a href="#reputation">Your record</a><a href={BRADBURY_EXPLORER_URL} rel="noreferrer" target="_blank">Bradbury contract ↗</a></div><span>GenLayer Bradbury · {shortAddress(CREDENCE_CONTRACT_ADDRESS)}</span></footer>

      {xProofOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !walletBusy && setXProofOpen(false)}>
          <section aria-labelledby="x-proof-title" aria-modal="true" className="forecast-modal x-proof-modal" role="dialog">
            <button aria-label="Close X verification" className="modal-close" disabled={walletBusy} onClick={() => setXProofOpen(false)} type="button">×</button>
            <div className="modal-kicker">ONE X ACCOUNT · ONE WALLET</div>
            <h2 id="x-proof-title">{xProofMode === "replace" ? "Publish a new proof" : "Verify your X identity"}</h2>
            <p className="modal-rules">Post this exact challenge by itself from the X account you want permanently attached to this wallet. Replies do not count.</p>
            <div className="x-challenge-box">
              <span>EXACT POST TEXT</span>
              <code>{proofChallenge || "Create a challenge from your wallet first."}</code>
              <button disabled={!proofChallenge} onClick={copyProofChallenge} type="button">Copy challenge</button>
            </div>
            <a className="x-post-button" href={xPostIntent} rel="noreferrer" target="_blank">Open X and publish exact text ↗</a>
            <label className="x-proof-field">
              <span>Public X post URL</span>
              <input
                onChange={(event) => setXProofUrl(event.target.value)}
                placeholder="https://x.com/yourhandle/status/…"
                type="url"
                value={xProofUrl}
              />
              <small>GenLayer validators independently check the post, its author’s stable account ID, and the exact challenge.</small>
            </label>
            <button className="commit-button" disabled={walletBusy || !proofChallenge || !xProofUrl.trim()} onClick={submitXProof} type="button">
              {walletBusy ? "GenLayer is checking X…" : xProofMode === "replace" ? "Verify new proof" : "Bind X and unlock 100 REP"}
              {!walletBusy && <ShieldIcon />}
            </button>
          </section>
        </div>
      )}

      {composerOpen && <ClaimModal availableReputation={profile.availableReputation} busy={busy} mode={ledgerMode} onClose={() => !busy && setComposerOpen(false)} onSubmit={submitClaim} reputation={profile.reputation} />}
    </div>
  );
}
