"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommunityFeed } from "../lib/community-data";
import type {
  MarketCategory,
  MarketFeed,
  MarketResolutionReadiness,
  SourcedMarket,
} from "../lib/product-data";
import {
  CredenceTransactionExecutionError,
  connectCredenceWallet,
  isStudioNetChainId,
  normalizeFarcasterCastUrl,
  normalizeXProofUrl,
  readBindingChallenge,
  readChainIdentity,
  readChainProfile,
  readCredenceTransactionState,
  readProtocolStats,
  readUserPositions,
  switchToStudioNet,
  watchCredenceProvider,
  type BindingChallenge,
  type ChainIdentity,
  type ChainPosition,
  type ChainProfile,
  type ChainProtocolStats,
  type ConnectedCredenceWallet,
} from "../lib/genlayer-client";
import {
  CREDREP_CONTRACT_ADDRESS,
  STUDIONET_EXPLORER_URL,
  shortAddress,
} from "../lib/deployment";
import { ClockIcon, CloseIcon, MarkIcon, SearchIcon, ShieldIcon } from "./icons";

type Notice = { tone: "good" | "bad" | "plain"; text: string };
type View = "feed" | "record" | "community";
type VerificationAttempt = {
  transactionHash: `0x${string}`;
  purpose: "BIND" | "REVERIFY";
  status: "PENDING" | "FAILED";
  error: string;
};
type PendingActionKind =
  | "PREDICT"
  | "RESOLVE"
  | "VOID"
  | "SETTLE"
  | "RECOVERY"
  | "X_CHALLENGE";
type PendingAction = {
  transactionHash: `0x${string}`;
  kind: PendingActionKind;
  label: string;
  status: "PENDING" | "FAILED";
  error: string;
};

const PENDING_RECONCILIATION_INTERVAL_MS = 4_000;

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

function verificationStorageKey(address: string) {
  return `credrep:x-verification:${CREDREP_CONTRACT_ADDRESS.toLowerCase()}:${address.toLowerCase()}`;
}

function actionStorageKey(address: string) {
  return `credrep:pending-action:${CREDREP_CONTRACT_ADDRESS.toLowerCase()}:${address.toLowerCase()}`;
}

function readVerificationAttempt(address: string): VerificationAttempt | null {
  try {
    const stored = window.localStorage.getItem(verificationStorageKey(address));
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<VerificationAttempt>;
    if (
      typeof value.transactionHash !== "string" ||
      !/^0x[0-9a-f]{64}$/i.test(value.transactionHash) ||
      (value.purpose !== "BIND" && value.purpose !== "REVERIFY") ||
      (value.status !== "PENDING" && value.status !== "FAILED")
    ) {
      return null;
    }
    return {
      transactionHash: value.transactionHash as `0x${string}`,
      purpose: value.purpose,
      status: value.status,
      error: typeof value.error === "string" ? value.error : "",
    };
  } catch {
    return null;
  }
}

function writeVerificationAttempt(
  address: string,
  attempt: VerificationAttempt | null,
) {
  try {
    const key = verificationStorageKey(address);
    if (attempt) window.localStorage.setItem(key, JSON.stringify(attempt));
    else window.localStorage.removeItem(key);
  } catch {
    // Device-local tracking is a convenience; chain state remains authoritative.
  }
}

function readPendingAction(address: string): PendingAction | null {
  try {
    const stored = window.localStorage.getItem(actionStorageKey(address));
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<PendingAction>;
    const kinds: PendingActionKind[] = [
      "PREDICT",
      "RESOLVE",
      "VOID",
      "SETTLE",
      "RECOVERY",
      "X_CHALLENGE",
    ];
    if (
      typeof value.transactionHash !== "string" ||
      !/^0x[0-9a-f]{64}$/i.test(value.transactionHash) ||
      !kinds.includes(value.kind as PendingActionKind) ||
      (value.status !== "PENDING" && value.status !== "FAILED") ||
      typeof value.label !== "string"
    ) {
      return null;
    }
    return {
      transactionHash: value.transactionHash as `0x${string}`,
      kind: value.kind as PendingActionKind,
      label: value.label.slice(0, 160),
      status: value.status,
      error: typeof value.error === "string" ? value.error : "",
    };
  } catch {
    return null;
  }
}

function writePendingAction(address: string, action: PendingAction | null) {
  try {
    const key = actionStorageKey(address);
    if (action) window.localStorage.setItem(key, JSON.stringify(action));
    else window.localStorage.removeItem(key);
  } catch {
    // Device-local tracking prevents accidental resubmission after a refresh.
  }
}

function verificationTransactionUrl(transactionHash: string) {
  return `${STUDIONET_EXPLORER_URL}tx/${transactionHash}`;
}

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

async function fetchCommunityFeed(): Promise<CommunityFeed> {
  const response = await fetch("/api/community", {
    headers: { accept: "application/json" },
  });
  const body = (await response.json()) as CommunityFeed & { error?: string };
  if (!response.ok) throw new Error(body.error || "Community feed unavailable.");
  return body;
}

async function fetchMarketFeed(signal?: AbortSignal): Promise<MarketFeed> {
  const response = await fetch("/api/markets", {
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as MarketFeed & { error?: string };
  if (!response.ok) throw new Error(body.error || "Market feed unavailable.");
  return body;
}

async function fetchMarketResolutionReadiness(
  marketId: string,
): Promise<MarketResolutionReadiness> {
  const response = await fetch(
    `/api/markets/${encodeURIComponent(marketId)}/resolution`,
    {
      headers: { accept: "application/json" },
      cache: "no-store",
    },
  );
  const body = (await response.json()) as MarketResolutionReadiness & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Could not check Polymarket.");
  }
  return body;
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

export function CredrepApp() {
  const [feed, setFeed] = useState<MarketFeed | null>(null);
  const [feedError, setFeedError] = useState("");
  const [community, setCommunity] = useState<CommunityFeed | null>(null);
  const [communityError, setCommunityError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [view, setView] = useState<View>("feed");
  const [wallet, setWallet] = useState<ConnectedCredenceWallet | null>(null);
  const [networkReady, setNetworkReady] = useState(true);
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
  const [farcasterProofUrl, setFarcasterProofUrl] = useState("");
  const [verificationAttempt, setVerificationAttempt] =
    useState<VerificationAttempt | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const loadCommunity = useCallback(async () => {
    try {
      const body = await fetchCommunityFeed();
      setCommunity(body);
      setCommunityError("");
    } catch (error) {
      setCommunityError(
        error instanceof Error ? error.message : "Community feed unavailable.",
      );
    }
  }, []);

  const syncWalletIndex = useCallback(async (
    address: string,
    connected?: ConnectedCredenceWallet,
    authorize = false,
  ) => {
    try {
      let response = await fetch("/api/index", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      let body = (await response.json()) as {
        error?: string;
        code?: string;
      };
      if (
        response.status === 401 &&
        body.code === "WALLET_SIGNATURE_REQUIRED"
      ) {
        if (!authorize || !connected) return;
        const challengeResponse = await fetch("/api/index/challenge", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ address }),
        });
        const challenge = (await challengeResponse.json()) as {
          error?: string;
          nonce?: string;
          message?: string;
        };
        if (!challengeResponse.ok || !challenge.nonce || !challenge.message) {
          throw new Error(challenge.error || "Wallet authorization failed.");
        }
        const signature = await connected.signIndexAuthorization(
          challenge.message,
        );
        response = await fetch("/api/index", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            address,
            nonce: challenge.nonce,
            signature,
          }),
        });
        body = (await response.json()) as { error?: string; code?: string };
      }
      if (!response.ok) throw new Error(body.error || "Wallet sync failed.");
      await loadCommunity();
    } catch (error) {
      setCommunityError(
        error instanceof Error ? error.message : "Wallet sync failed.",
      );
    }
  }, [loadCommunity]);

  const loadWallet = useCallback(async (
    address: string,
    authorizeIndex = false,
    connectedWallet?: ConnectedCredenceWallet,
  ) => {
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
    if (nextProfile.registered && connectedWallet) {
      void syncWalletIndex(address, connectedWallet, authorizeIndex);
    }
  }, [syncWalletIndex]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMarketFeed(controller.signal)
      .then((body) => {
        setFeed(body);
        setFeedError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFeedError(error instanceof Error ? error.message : "Market feed unavailable.");
      });
    readProtocolStats().then(setProtocol).catch(() => setProtocol(null));
    fetchCommunityFeed()
      .then((body) => {
        setCommunity(body);
        setCommunityError("");
      })
      .catch((error: unknown) => {
        setCommunityError(
          error instanceof Error ? error.message : "Community feed unavailable.",
        );
      });
    const refreshTimer = window.setInterval(() => {
      fetchMarketFeed()
        .then((body) => {
          setFeed(body);
          setFeedError("");
        })
        .catch((error: unknown) => {
          setFeedError(
            error instanceof Error ? error.message : "Market feed unavailable.",
          );
        });
      void loadCommunity();
    }, 5 * 60_000);
    return () => {
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [loadCommunity]);

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

  const maximumStake = profile?.registered && profile.availableReputation > 0
    ? Math.max(1, Math.floor((profile.availableReputation * (protocol?.maxStakeBps ?? 2_000)) / 10_000))
    : 0;
  const feedTimeUnix = feed
    ? Math.floor(Date.parse(feed.fetchedAt) / 1_000)
    : 0;

  function rememberVerification(
    address: string,
    attempt: VerificationAttempt | null,
  ) {
    setVerificationAttempt(attempt);
    writeVerificationAttempt(address, attempt);
  }

  function rememberPendingAction(
    address: string,
    action: PendingAction | null,
  ) {
    setPendingAction(action);
    writePendingAction(address, action);
  }

  const transactionInFlight =
    pendingAction?.status === "PENDING" ||
    verificationAttempt?.status === "PENDING";

  async function checkPendingAction(
    connected: ConnectedCredenceWallet,
    action: PendingAction,
  ) {
    setBusy("pending-action");
    setNotice({ tone: "plain", text: "Checking transaction…" });
    try {
      const transactionState = await readCredenceTransactionState(
        action.transactionHash,
      );
      if (transactionState === "PENDING") {
        setNotice({ tone: "plain", text: "Transaction pending." });
        return;
      }
      if (transactionState === "FAILED") {
        throw new CredenceTransactionExecutionError(action.transactionHash);
      }
      await loadWallet(connected.address, true, connected);
      rememberPendingAction(connected.address, null);
      setNotice({ tone: "good", text: `${action.label} confirmed.` });
    } catch (error) {
      if (error instanceof CredenceTransactionExecutionError) {
        rememberPendingAction(connected.address, {
          ...action,
          status: "FAILED",
          error: error.message,
        });
        setNotice({ tone: "bad", text: `${action.label} failed on-chain.` });
      } else {
        rememberPendingAction(connected.address, action);
        setNotice({
          tone: "plain",
          text: "Transaction pending.",
        });
      }
    } finally {
      setBusy("");
    }
  }

  async function runTrackedAction(options: {
    busyKey: string;
    kind: PendingActionKind;
    label: string;
    pendingText: string;
    successText: string;
    execute(onSubmitted: (transactionHash: `0x${string}`) => void): Promise<unknown>;
    afterSuccess?(): void;
  }) {
    if (!wallet) return;
    if (!networkReady) {
      setNotice({ tone: "plain", text: "Switch your wallet to StudioNet first." });
      return;
    }
    if (transactionInFlight) {
      setNotice({
        tone: "plain",
        text: "Transaction pending.",
      });
      return;
    }

    let submittedAction: PendingAction | null = null;
    setBusy(options.busyKey);
    setNotice({ tone: "plain", text: options.pendingText });
    try {
      await options.execute((transactionHash) => {
        submittedAction = {
          transactionHash,
          kind: options.kind,
          label: options.label,
          status: "PENDING",
          error: "",
        };
        rememberPendingAction(wallet.address, submittedAction);
        setNotice({
          tone: "plain",
          text: "Transaction pending.",
        });
      });
      await loadWallet(wallet.address, false, wallet);
      rememberPendingAction(wallet.address, null);
      options.afterSuccess?.();
      setNotice({ tone: "good", text: options.successText });
    } catch (error) {
      const submitted = submittedAction as PendingAction | null;
      if (submitted && error instanceof CredenceTransactionExecutionError) {
        rememberPendingAction(wallet.address, {
          ...submitted,
          status: "FAILED",
          error: error.message,
        });
        setNotice({ tone: "bad", text: `${options.label} failed on-chain.` });
      } else if (submitted) {
        rememberPendingAction(wallet.address, submitted);
        setNotice({
          tone: "plain",
          text: "Transaction pending.",
        });
      } else {
        setNotice({
          tone: "bad",
          text: error instanceof Error ? error.message : `${options.label} failed.`,
        });
      }
    } finally {
      setBusy("");
    }
  }

  async function checkVerification(
    connected: ConnectedCredenceWallet,
    attempt: VerificationAttempt,
  ) {
    setBusy("identity");
    setIdentityOpen(true);
    setNotice({ tone: "plain", text: "Checking verification…" });
    try {
      const transactionState = await readCredenceTransactionState(
        attempt.transactionHash,
      );
      if (transactionState === "PENDING") {
        setNotice({ tone: "plain", text: "Verification pending." });
        return;
      }
      if (transactionState === "FAILED") {
        throw new CredenceTransactionExecutionError(attempt.transactionHash);
      }
      await loadWallet(connected.address, true, connected);
      rememberVerification(connected.address, null);
      setProofUrl("");
      setFarcasterProofUrl("");
      setIdentityOpen(false);
      setNotice({
        tone: "good",
        text: attempt.purpose === "REVERIFY"
          ? "Identity reverified."
          : "Identity verified. You have 100 REP.",
      });
    } catch (error) {
      if (error instanceof CredenceTransactionExecutionError) {
        const failedAttempt: VerificationAttempt = {
          ...attempt,
          status: "FAILED",
          error: error.message,
        };
        rememberVerification(connected.address, failedAttempt);
        setNotice({
          tone: "bad",
          text: "Verification failed on-chain. No REP was awarded.",
        });
      } else {
        rememberVerification(connected.address, attempt);
        setNotice({
          tone: "plain",
          text: "Verification pending.",
        });
      }
    } finally {
      setBusy("");
    }
  }

  async function connectWallet() {
    setBusy("connect");
    setNotice(null);
    try {
      const connected = await connectCredenceWallet();
      const storedAttempt = readVerificationAttempt(connected.address);
      const storedAction = readPendingAction(connected.address);
      setWallet(connected);
      setNetworkReady(true);
      setVerificationAttempt(storedAttempt);
      setPendingAction(storedAction);
      setProofUrl("");
      setFarcasterProofUrl("");
      if (storedAttempt) setIdentityOpen(true);
      await loadWallet(connected.address, true, connected);
      setNotice({
        tone: storedAttempt || storedAction ? "plain" : "good",
        text: storedAttempt
          ? storedAttempt.status === "PENDING"
            ? "A submitted identity verification is being checked."
            : "Your last identity verification failed. Review it before retrying."
          : storedAction
            ? storedAction.status === "PENDING"
              ? `A submitted ${storedAction.label.toLowerCase()} is being checked.`
              : `Your last ${storedAction.label.toLowerCase()} failed.`
          : "Wallet connected.",
      });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Could not connect wallet." });
    } finally {
      setBusy("");
    }
  }

  function disconnectWallet() {
    setWallet(null);
    setProfile(null);
    setIdentity(null);
    setChallenge(null);
    setPositions([]);
    setPendingAction(null);
    setVerificationAttempt(null);
    setIdentityOpen(false);
    setSelectedMarket(null);
    setNetworkReady(true);
    setNotice({ tone: "plain", text: "Wallet disconnected from this page." });
  }

  async function changeToStudioNet() {
    setBusy("network");
    try {
      await switchToStudioNet();
      setNetworkReady(true);
      setNotice({ tone: "good", text: "Wallet switched to StudioNet." });
    } catch (error) {
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : "Could not switch network.",
      });
    } finally {
      setBusy("");
    }
  }

  function chooseMarket(market: SourcedMarket, prediction: "YES" | "NO") {
    if (!wallet) {
      setNotice({ tone: "plain", text: "Connect your StudioNet wallet first." });
      return;
    }
    if (!networkReady) {
      setNotice({ tone: "plain", text: "Switch your wallet to StudioNet first." });
      return;
    }
    if (transactionInFlight) {
      setNotice({ tone: "plain", text: "Transaction pending." });
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
    await runTrackedAction({
      busyKey: "predict",
      kind: "PREDICT",
      label: `Back ${selection} with ${stake} REP`,
      pendingText: "Checking market…",
      successText: `${stake} REP now backs ${selection}.`,
      execute: (onSubmitted) =>
        wallet.makePrediction(
          {
            marketId: selectedMarket.id,
            prediction: selection,
            confidenceBps: confidence * 100,
            stake,
          },
          onSubmitted,
        ),
      afterSuccess: () => setSelectedMarket(null),
    });
  }

  async function beginProof() {
    if (!wallet) return;
    if (pendingAction?.status === "PENDING") {
      setNotice({
        tone: "plain",
        text: "Transaction pending.",
      });
      return;
    }
    if (verificationAttempt?.status === "PENDING") {
      setNotice({
        tone: "plain",
        text: "Verification pending.",
      });
      return;
    }
    rememberVerification(wallet.address, null);
    await runTrackedAction({
      busyKey: "identity",
      kind: "X_CHALLENGE",
      label: identity?.bound ? "Create identity recheck" : "Create identity verification",
      pendingText: "Creating challenge…",
      successText: "Challenge ready. Post it exactly as shown.",
      execute: (onSubmitted) =>
        identity?.bound
          ? wallet.beginXReverification(onSubmitted)
          : wallet.beginXBinding(onSubmitted),
    });
  }

  async function verifyProof(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet || !challenge?.active) return;
    if (pendingAction?.status === "PENDING") {
      setNotice({ tone: "plain", text: "Transaction pending." });
      return;
    }
    if (verificationAttempt) {
      setNotice({
        tone: "plain",
        text: verificationAttempt.status === "PENDING"
          ? "Verification pending."
          : "Clear the failed verification before retrying.",
      });
      return;
    }

    let canonicalProofUrl: string;
    let canonicalFarcasterProofUrl: string;
    try {
      canonicalProofUrl = normalizeXProofUrl(proofUrl);
      canonicalFarcasterProofUrl = normalizeFarcasterCastUrl(farcasterProofUrl);
      setProofUrl(canonicalProofUrl);
      setFarcasterProofUrl(canonicalFarcasterProofUrl);
    } catch (error) {
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : "Paste a valid X post URL.",
      });
      return;
    }

    const purpose = challenge.purpose === "REVERIFY" ? "REVERIFY" : "BIND";
    let submittedAttempt: VerificationAttempt | null = null;
    setBusy("identity");
    setNotice({ tone: "plain", text: "Verifying post…" });
    try {
      const onSubmitted = (transactionHash: `0x${string}`) => {
        submittedAttempt = {
          transactionHash,
          purpose,
          status: "PENDING",
          error: "",
        };
        rememberVerification(wallet.address, submittedAttempt);
        setNotice({
          tone: "plain",
          text: "Verification pending.",
        });
      };
      if (purpose === "REVERIFY") {
        await wallet.verifyXReverification(
          canonicalProofUrl,
          canonicalFarcasterProofUrl,
          onSubmitted,
        );
      } else {
        await wallet.verifyXBinding(
          canonicalProofUrl,
          canonicalFarcasterProofUrl,
          onSubmitted,
        );
      }
      await loadWallet(wallet.address, true, wallet);
      rememberVerification(wallet.address, null);
      setProofUrl("");
      setFarcasterProofUrl("");
      setIdentityOpen(false);
      setNotice({ tone: "good", text: purpose === "REVERIFY" ? "Identity reverified." : "Identity verified. You have 100 REP." });
    } catch (error) {
      const submitted = submittedAttempt as VerificationAttempt | null;
      if (submitted && error instanceof CredenceTransactionExecutionError) {
        const failedAttempt: VerificationAttempt = {
          ...submitted,
          status: "FAILED",
          error: error.message,
        };
        rememberVerification(wallet.address, failedAttempt);
        setNotice({
          tone: "bad",
          text: "Verification failed on-chain. No REP was awarded.",
        });
      } else if (submitted) {
        rememberVerification(wallet.address, submitted);
        setNotice({
          tone: "plain",
          text: "Verification pending.",
        });
      } else {
        setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Verification failed." });
      }
    } finally {
      setBusy("");
    }
  }

  async function resolvePosition(position: ChainPosition) {
    if (!wallet) return;
    if (transactionInFlight) {
      setNotice({ tone: "plain", text: "Transaction pending." });
      return;
    }

    setBusy(position.marketId);
    setNotice({ tone: "plain", text: "Checking Polymarket…" });
    let readiness: MarketResolutionReadiness | null = null;
    try {
      readiness = await fetchMarketResolutionReadiness(position.marketId);
    } catch (error) {
      setNotice({
        tone: "bad",
        text: error instanceof Error ? error.message : "Could not check Polymarket.",
      });
    } finally {
      setBusy("");
    }
    if (!readiness) return;
    if (!readiness.resolvable) {
      setNotice({ tone: "plain", text: "Polymarket has not finalized this yet." });
      return;
    }

    await runTrackedAction({
      busyKey: position.marketId,
      kind: "RESOLVE",
      label: "Resolve market",
      pendingText: "Resolving…",
      successText: "Ready to settle.",
      execute: (onSubmitted) =>
        wallet.resolveMarket(position.marketId, onSubmitted),
    });
  }

  async function settlePosition(position: ChainPosition) {
    if (!wallet) return;
    await runTrackedAction({
      busyKey: position.marketId,
      kind: "SETTLE",
      label: "Settle prediction",
      pendingText: "Settling…",
      successText: "Your REP and Prediction Score are updated.",
      execute: (onSubmitted) =>
        wallet.settlePrediction(position.marketId, onSubmitted),
    });
  }

  async function voidPosition(position: ChainPosition) {
    if (!wallet) return;
    await runTrackedAction({
      busyKey: position.marketId,
      kind: "VOID",
      label: "Void stale market",
      pendingText: "Voiding market…",
      successText: "Market voided. Settle to reclaim your REP.",
      execute: (onSubmitted) =>
        wallet.voidStaleMarket(position.marketId, onSubmitted),
    });
  }

  async function recover(action: "start" | "claim") {
    if (!wallet) return;
    await runTrackedAction({
      busyKey: "recovery",
      kind: "RECOVERY",
      label: action === "start" ? "Start REP recovery" : "Claim recovered REP",
      pendingText: action === "start" ? "Starting REP recovery…" : "Claiming recovered REP…",
      successText: action === "start" ? "REP recovery started." : "Recovered REP claimed.",
      execute: (onSubmitted) =>
        action === "start"
          ? wallet.startRecovery(onSubmitted)
          : wallet.claimRecovery(onSubmitted),
    });
  }

  const connectedAddress = wallet?.address;
  useEffect(() => {
    if (!connectedAddress) return;
    return watchCredenceProvider({
      onAccountsChanged(accounts) {
        const nextAddress = accounts[0];
        if (!nextAddress) {
          setWallet(null);
          setProfile(null);
          setIdentity(null);
          setChallenge(null);
          setPositions([]);
          setPendingAction(null);
          setVerificationAttempt(null);
          setIdentityOpen(false);
          setSelectedMarket(null);
          setNetworkReady(true);
          setNotice({ tone: "plain", text: "Wallet disconnected from this page." });
          return;
        }
        if (nextAddress.toLowerCase() === connectedAddress.toLowerCase()) return;
        void (async () => {
          setBusy("connect");
          try {
            const connected = await connectCredenceWallet(nextAddress);
            setWallet(connected);
            setNetworkReady(true);
            setVerificationAttempt(readVerificationAttempt(connected.address));
            setPendingAction(readPendingAction(connected.address));
            setIdentityOpen(false);
            setSelectedMarket(null);
            await loadWallet(connected.address, true, connected);
            setNotice({ tone: "good", text: "Connected wallet account changed." });
          } catch (error) {
            setNotice({
              tone: "bad",
              text: error instanceof Error ? error.message : "Could not load the new wallet account.",
            });
          } finally {
            setBusy("");
          }
        })();
      },
      onChainChanged(chainId) {
        const ready = isStudioNetChainId(chainId);
        setNetworkReady(ready);
        if (!ready) {
          setNotice({ tone: "plain", text: "Switch your wallet back to StudioNet to continue." });
        }
      },
    });
  }, [connectedAddress, loadWallet]);

  useEffect(() => {
    const action = pendingAction?.status === "PENDING" ? pendingAction : null;
    const attempt = verificationAttempt?.status === "PENDING"
      ? verificationAttempt
      : null;
    if (!wallet || !networkReady || (!action && !attempt)) return;

    let disposed = false;
    let checking = false;
    const trackedTransaction = attempt?.transactionHash ?? action!.transactionHash;

    const reconcileSubmittedTransaction = async () => {
      if (checking) return;
      checking = true;
      try {
        const transactionState = await readCredenceTransactionState(
          trackedTransaction,
        );
        if (disposed || transactionState === "PENDING") return;

        if (transactionState === "FAILED") {
          if (attempt) {
            const failedAttempt: VerificationAttempt = {
              ...attempt,
              status: "FAILED",
              error: "The transaction failed on-chain.",
            };
            setVerificationAttempt(failedAttempt);
            writeVerificationAttempt(wallet.address, failedAttempt);
            setNotice({
              tone: "bad",
              text: "Verification failed on-chain. No REP was awarded.",
            });
          } else if (action) {
            const failedAction: PendingAction = {
              ...action,
              status: "FAILED",
              error: "The transaction failed on-chain.",
            };
            setPendingAction(failedAction);
            writePendingAction(wallet.address, failedAction);
            setNotice({ tone: "bad", text: `${action.label} failed on-chain.` });
          }
          setBusy("");
          return;
        }

        await loadWallet(wallet.address, false, wallet);
        if (disposed) return;
        setBusy("");

        if (attempt) {
          setVerificationAttempt(null);
          writeVerificationAttempt(wallet.address, null);
          setProofUrl("");
          setFarcasterProofUrl("");
          setIdentityOpen(false);
          setNotice({
            tone: "good",
            text: attempt.purpose === "REVERIFY"
              ? "Identity reverified."
              : "Identity verified. You have 100 REP.",
          });
        } else if (action) {
          setPendingAction(null);
          writePendingAction(wallet.address, null);
          if (action.kind === "X_CHALLENGE") {
            setIdentityOpen(true);
            setNotice({
              tone: "good",
              text: "Challenge ready. Post it exactly as shown.",
            });
          } else {
            setNotice({ tone: "good", text: `${action.label} confirmed.` });
          }
        }
      } catch {
        // Temporary RPC failures are retried while the transaction stays pending.
      } finally {
        checking = false;
      }
    };

    void reconcileSubmittedTransaction();
    const reconciliationTimer = window.setInterval(
      () => void reconcileSubmittedTransaction(),
      PENDING_RECONCILIATION_INTERVAL_MS,
    );
    return () => {
      disposed = true;
      window.clearInterval(reconciliationTimer);
    };
  }, [loadWallet, networkReady, pendingAction, verificationAttempt, wallet]);

  useEffect(() => {
    if (!connectedAddress) return;
    const reconciliationTimer = window.setInterval(() => {
      loadWallet(connectedAddress).catch(() => {
        setCommunityError("Wallet index refresh will retry automatically.");
      });
    }, 5 * 60_000);
    return () => window.clearInterval(reconciliationTimer);
  }, [connectedAddress, loadWallet]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("feed")} aria-label="CREDREP home">
          <span className="brand-mark"><MarkIcon /></span>
          CREDREP
        </button>
        <div className="header-actions">
          {wallet && (
            <button className="quiet-button" onClick={() => setIdentityOpen(true)}>
              <ShieldIcon /> {identity?.bound ? `@${identity.handle}` : "Verify identity"}
            </button>
          )}
          <button
            className="wallet-button"
            onClick={wallet ? networkReady ? disconnectWallet : changeToStudioNet : connectWallet}
            disabled={Boolean(busy)}
            title={wallet && networkReady ? "Disconnect wallet" : undefined}
          >
            {wallet
              ? networkReady
                ? shortAddress(wallet.address)
                : "Switch network"
              : busy === "connect"
                ? "Connecting…"
                : "Connect wallet"}
          </button>
        </div>
      </header>

      {notice && (
        <button className={`notice notice-${notice.tone}`} onClick={() => setNotice(null)}>
          {notice.text}<span>×</span>
        </button>
      )}

      {pendingAction && wallet && (
        <div className={`transaction-status transaction-status-${pendingAction.status.toLowerCase()}`} role="status">
          <div>
            <strong>{pendingAction.status === "PENDING" ? "Transaction pending" : `${pendingAction.label} failed`}</strong>
            <span>{pendingAction.status === "PENDING" ? pendingAction.label : pendingAction.error || "Not applied."}</span>
          </div>
          <a href={verificationTransactionUrl(pendingAction.transactionHash)} target="_blank" rel="noreferrer">
            Explorer ↗
          </a>
          <button
            disabled={busy === "pending-action"}
            onClick={() => {
              if (pendingAction.status === "PENDING") {
                void checkPendingAction(wallet, pendingAction);
              } else {
                rememberPendingAction(wallet.address, null);
                setNotice(null);
              }
            }}
          >
            {busy === "pending-action"
              ? "Checking…"
              : pendingAction.status === "PENDING"
                ? "Check status"
                : "Dismiss"}
          </button>
        </div>
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

        <nav className="view-tabs" aria-label="CREDREP views">
          <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>Live questions</button>
          <button className={view === "record" ? "active" : ""} onClick={() => setView("record")}>My record {positions.length ? `(${positions.length})` : ""}</button>
          <button className={view === "community" ? "active" : ""} onClick={() => setView("community")}>Community</button>
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
                Questions from <a href="https://polymarket.com" target="_blank" rel="noreferrer">Polymarket</a>. No money, odds, or pool is copied into CREDREP.
                {feed.stale ? " Showing the latest cached feed." : ""}
              </p>
            )}
          </section>
        ) : view === "record" ? (
          <section className="record-section">
            {!wallet && <div className="empty-state"><h2>Connect your wallet</h2><p>Your onchain prediction record will appear here.</p><button onClick={connectWallet}>Connect wallet</button></div>}
            {wallet && !profile?.registered && <div className="empty-state"><h2>Verify X and Farcaster</h2><p>This creates your non-transferable 100 REP identity.</p><button onClick={() => setIdentityOpen(true)}>Verify identity</button></div>}
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
                      <button disabled={busy === "recovery" || transactionInFlight || !networkReady} onClick={() => recover("start")}>Start</button>
                    ) : profile.recoverableReputation > 0 ? (
                      <button disabled={busy === "recovery" || transactionInFlight || !networkReady} onClick={() => recover("claim")}>Claim {profile.recoverableReputation}</button>
                    ) : null}
                  </div>
                )}

                {!positions.length ? (
                  <div className="empty-state"><h2>No predictions yet</h2><button onClick={() => setView("feed")}>Browse questions</button></div>
                ) : (
                  <div className="position-list">
                    {positions.map((position) => {
                      const canResolve = position.status === "OPEN" && position.market.status === "OPEN" && feedTimeUnix >= position.market.endTimeUnix;
                      const canVoid = position.status === "OPEN" && position.market.status === "OPEN" && feedTimeUnix >= position.market.voidAfterUnix;
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
                            {canResolve && <button disabled={busy === position.marketId || transactionInFlight || !networkReady} onClick={() => resolvePosition(position)}>Check result</button>}
                            {canVoid && <button disabled={busy === position.marketId || transactionInFlight || !networkReady} onClick={() => voidPosition(position)}>Void &amp; refund</button>}
                            {canSettle && <button disabled={busy === position.marketId || transactionInFlight || !networkReady} onClick={() => settlePosition(position)}>Settle</button>}
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
        ) : (
          <section className="community-section">
            <div className="community-header">
              <div>
                <p className="eyebrow">STUDIONET READ MODEL</p>
                <h2>Verified community record</h2>
                <p>Only contract-confirmed REP, scores, and positions appear here.</p>
              </div>
              <button onClick={() => void loadCommunity()}>Refresh</button>
            </div>

            {communityError && (
              <div className="community-message error-state">{communityError}</div>
            )}
            {!community && !communityError && (
              <div className="empty-state">Loading community record…</div>
            )}
            {community && !community.leaderboard.length && (
              <div className="empty-state">
                <h2>No indexed records yet</h2>
                <p>Connect a verified wallet to add its public StudioNet record.</p>
              </div>
            )}
            {community && community.leaderboard.length > 0 && (
              <div className="community-grid">
                <div className="community-panel leaderboard-panel">
                  <div className="panel-title">
                    <h3>Prediction score</h3>
                    <span>{community.indexedProfiles} verified</span>
                  </div>
                  <div className="leaderboard-scroll">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Forecaster</th>
                          <th>Score</th>
                          <th>Accuracy</th>
                          <th>Resolved</th>
                          <th>REP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {community.leaderboard.map((entry) => (
                          <tr key={entry.walletAddress}>
                            <td>#{entry.rank}</td>
                            <td>
                              <strong>{entry.xHandle ? `@${entry.xHandle}` : shortAddress(entry.walletAddress)}</strong>
                              {entry.xHandle && <small>{shortAddress(entry.walletAddress)}</small>}
                            </td>
                            <td>{entry.resolvedPredictions ? percent(entry.predictionScoreBps) : "—"}</td>
                            <td>{entry.resolvedPredictions ? percent(entry.accuracyBps) : "—"}</td>
                            <td>{entry.resolvedPredictions}</td>
                            <td>{entry.reputation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="community-panel activity-panel">
                  <div className="panel-title">
                    <h3>Recent backing</h3>
                    <span>Onchain</span>
                  </div>
                  {!community.activity.length ? (
                    <p className="activity-empty">No positions indexed yet.</p>
                  ) : (
                    <div className="activity-list">
                      {community.activity.map((item) => (
                        <article key={`${item.walletAddress}:${item.marketId}`}>
                          <div className="activity-top">
                            <strong>{item.xHandle ? `@${item.xHandle}` : shortAddress(item.walletAddress)}</strong>
                            <span className={`status status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                          </div>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.question}</a>
                          <p><strong>{item.prediction}</strong> · {Math.round(item.confidenceBps / 100)}% · {item.stake} REP</p>
                          <time>{formatDate(item.createdAt)}</time>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="community-footnote">
              GenLayer is the source of truth. This database is a refreshed public index.
            </p>
          </section>
        )}
      </main>

      <footer>
        <span>CREDREP · StudioNet</span>
        <div><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/support">Support</a><a href={STUDIONET_EXPLORER_URL} target="_blank" rel="noreferrer">Explorer</a><a href={`${STUDIONET_EXPLORER_URL}address/${CREDREP_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract</a></div>
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
              <button className="primary-button" disabled={busy === "predict" || maximumStake < 1 || transactionInFlight || !networkReady} type="submit">{busy === "predict" ? "Checking source…" : `Back ${selection} with ${stake} REP`}</button>
            </form>
          </section>
        </div>
      )}

      {identityOpen && wallet && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIdentityOpen(false)}>
          <section className="modal identity-modal" role="dialog" aria-modal="true" aria-labelledby="identity-title">
            <button className="modal-close" onClick={() => setIdentityOpen(false)} aria-label="Close"><CloseIcon /></button>
            <ShieldIcon className="identity-icon" />
            <h2 id="identity-title">Identity verification</h2>
            {identity?.bound && !identity.reverificationDue && !challenge?.active ? (
              <div className="verified-box"><strong>@{identity.handle} · Farcaster @{identity.farcasterHandle}</strong><span>Verified until {formatDate(identity.verifiedUntil)}</span></div>
            ) : challenge?.active ? (
              <form onSubmit={verifyProof}>
                <label className="field-label"><span>Post this exact text on X and Farcaster</span><textarea readOnly value={challenge.challenge} /></label>
                <div className="inline-actions">
                  <button type="button" onClick={() => navigator.clipboard.writeText(challenge.challenge)}>Copy</button>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(challenge.challenge)}`} target="_blank" rel="noreferrer">Post on X ↗</a>
                  <a href={`https://farcaster.xyz/~/compose?text=${encodeURIComponent(challenge.challenge)}`} target="_blank" rel="noreferrer">Cast on Farcaster ↗</a>
                </div>
                <label className="field-label"><span>X post URL</span><input className="text-input" required disabled={Boolean(verificationAttempt) || pendingAction?.status === "PENDING" || !networkReady} value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="https://x.com/you/status/…" /></label>
                <label className="field-label"><span>Farcaster cast URL</span><input className="text-input" required disabled={Boolean(verificationAttempt) || pendingAction?.status === "PENDING" || !networkReady} value={farcasterProofUrl} onChange={(event) => setFarcasterProofUrl(event.target.value)} placeholder="https://farcaster.xyz/you/0x…" /></label>
                {verificationAttempt ? (
                  <div className={`verification-status verification-status-${verificationAttempt.status.toLowerCase()}`} role="status">
                    <strong>{verificationAttempt.status === "PENDING" ? "Verification pending" : "Verification failed"}</strong>
                    <p>
                      {verificationAttempt.status === "PENDING"
                        ? "Pending."
                        : verificationAttempt.error || "Check the post and challenge text."}
                    </p>
                    <a href={verificationTransactionUrl(verificationAttempt.transactionHash)} target="_blank" rel="noreferrer">
                      View {shortAddress(verificationAttempt.transactionHash)} on Explorer ↗
                    </a>
                    <button
                      type="button"
                      disabled={busy === "identity"}
                      onClick={() => {
                        if (verificationAttempt.status === "PENDING") {
                          void checkVerification(wallet, verificationAttempt);
                        } else {
                          rememberVerification(wallet.address, null);
                          setNotice(null);
                        }
                      }}
                    >
                      {busy === "identity"
                        ? "Checking…"
                        : verificationAttempt.status === "PENDING"
                          ? "Check status"
                          : "Try again"}
                    </button>
                  </div>
                ) : (
                  <button className="primary-button" disabled={busy === "identity" || pendingAction?.status === "PENDING" || !networkReady} type="submit">{busy === "identity" ? "Verifying…" : challenge.purpose === "REVERIFY" ? "Reverify" : "Verify and receive 100 REP"}</button>
                )}
              </form>
            ) : (
              <div className="identity-start">
                <p>{identity?.bound ? "Fresh X and Farcaster posts recheck both accounts." : "One X account and one Farcaster ID bind to one wallet."}</p>
                <button className="primary-button" disabled={busy === "identity" || transactionInFlight || !networkReady} onClick={beginProof}>{busy === "identity" ? "Creating…" : identity?.bound ? "Create recheck" : "Create verification"}</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
