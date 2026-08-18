"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  type CalldataEncodable,
  CalldataAddress,
  type Hash,
  TransactionStatus,
} from "genlayer-js/types";
import {
  CREDREP_CONTRACT_ADDRESS,
  STUDIONET_CHAIN_ID,
  STUDIONET_EXPLORER_URL,
} from "./deployment";
import { genLayerExecutionOutcome } from "./genlayer-receipt";

type ProviderListener = (value: unknown) => void;

type BrowserProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: "accountsChanged" | "chainChanged", listener: ProviderListener): void;
  removeListener?(
    event: "accountsChanged" | "chainChanged",
    listener: ProviderListener,
  ): void;
};

type OnSubmitted = (transactionHash: `0x${string}`) => void;

export type CredenceTransactionState = "PENDING" | "SUCCESS" | "FAILED";

const TRANSACTION_POLL_INTERVAL_MS = 1_500;
const TRANSACTION_POLL_RETRIES = 80;

export type IdentityStatus =
  | "UNBOUND"
  | "PENDING"
  | "VERIFIED"
  | "GRACE"
  | "STALE";

export type ChainProfile = {
  registered: boolean;
  reputation: number;
  availableReputation: number;
  reputationAtRisk: number;
  predictionsMade: number;
  openPredictions: number;
  resolvedPredictions: number;
  correctPredictions: number;
  voidPredictions: number;
  accuracyBps: number;
  predictionScoreBps: number;
  xIdentityBound: boolean;
  xHandle: string;
  xIdentityStatus: IdentityStatus;
  xVerifiedUntil: number;
  farcasterIdentityBound: boolean;
  farcasterFid: string;
  farcasterHandle: string;
  dualSourceIdentityBound: boolean;
  recoveryActive: boolean;
  recoveryNextAt: number;
  recoverableReputation: number;
};

export type BindingChallenge = {
  challenge: string;
  expiresAt: number;
  active: boolean;
  attempt: number;
  purpose: "" | "BIND" | "REVERIFY";
};

export type ChainIdentity = {
  bound: boolean;
  dualSourceBound: boolean;
  status: IdentityStatus;
  handle: string;
  identityId: string;
  proofUrl: string;
  farcasterFid: string;
  farcasterHandle: string;
  farcasterProofUrl: string;
  verifiedAt: number;
  verifiedUntil: number;
  graceUntil: number;
  reverificationDue: boolean;
  reverificationPending: boolean;
  canPredict: boolean;
};

export type ChainProtocolStats = {
  users: number;
  markets: number;
  predictions: number;
  startingReputation: number;
  maxStakeBps: number;
  marketVoidTimeoutSeconds: number;
};

export type ChainMarket = {
  id: string;
  question: string;
  description: string;
  slug: string;
  sourceUrl: string;
  conditionId: string;
  settlementSource: string;
  endTimeUnix: number;
  voidAfterUnix: number;
  status: "OPEN" | "RESOLVED" | "VOID";
  outcome: "YES" | "NO" | "VOID" | "";
  predictionCount: number;
  totalReputationStaked: number;
};

export type ChainPosition = {
  exists: boolean;
  marketId: string;
  prediction: "YES" | "NO";
  confidenceBps: number;
  stake: number;
  status: "OPEN" | "WON" | "LOST" | "VOID";
  scoreBps: number;
  createdAt: string;
  settledAt: string;
  market: ChainMarket;
};

export type ConnectedCredenceWallet = {
  address: `0x${string}`;
  signIndexAuthorization(message: string): Promise<`0x${string}`>;
  beginIdentityBinding(onSubmitted?: OnSubmitted): Promise<`0x${string}`>;
  verifyIdentityBinding(
    proofUrl: string,
    farcasterProofUrl: string,
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
  beginIdentityReverification(onSubmitted?: OnSubmitted): Promise<`0x${string}`>;
  verifyIdentityReverification(
    proofUrl: string,
    farcasterProofUrl: string,
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
  startRecovery(onSubmitted?: OnSubmitted): Promise<`0x${string}`>;
  claimRecovery(onSubmitted?: OnSubmitted): Promise<`0x${string}`>;
  makePrediction(
    input: {
      marketId: string;
      prediction: "YES" | "NO";
      confidenceBps: number;
      stake: number;
    },
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
  resolveMarket(
    marketId: string,
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
  voidStaleMarket(
    marketId: string,
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
  settlePrediction(
    marketId: string,
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`>;
};

const readClient = createClient({ chain: studionet });

export class CredenceTransactionExecutionError extends Error {
  readonly transactionHash: `0x${string}`;

  constructor(transactionHash: `0x${string}`) {
    super("Accepted with an execution error. No REP was awarded.");
    this.name = "CredenceTransactionExecutionError";
    this.transactionHash = transactionHash;
  }
}

export function normalizeXProofUrl(raw: string): string {
  const value = raw.trim();
  if (value.length < 20 || value.length > 300) {
    throw new Error("Paste the full URL of your public X post.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Paste a valid X post URL.");
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (parsed.protocol !== "https:" || (host !== "x.com" && host !== "twitter.com")) {
    throw new Error("The proof must be a post URL from x.com or twitter.com.");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (
    parts.length !== 3 ||
    !/^[A-Za-z0-9_]{1,15}$/.test(parts[0]) ||
    parts[1].toLowerCase() !== "status" ||
    !/^\d{5,32}$/.test(parts[2])
  ) {
    throw new Error("Paste the URL of the X post, not a profile or feed URL.");
  }

  return `https://x.com/${parts[0]}/status/${parts[2]}`;
}

export function normalizeFarcasterCastUrl(raw: string): string {
  const value = raw.trim();
  if (value.length < 30 || value.length > 300) {
    throw new Error("Paste the full URL of your public Farcaster cast.");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Paste a valid Farcaster cast URL.");
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || host !== "farcaster.xyz") {
    throw new Error("The second proof must be a cast URL from farcaster.xyz.");
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  const validHandle =
    parts.length > 0 &&
    /^[A-Za-z0-9][A-Za-z0-9_.-]{0,30}[A-Za-z0-9]$/.test(parts[0]);
  const singleCharacterHandle =
    parts.length > 0 && /^[A-Za-z0-9]$/.test(parts[0]);
  if (
    parts.length !== 2 ||
    (!validHandle && !singleCharacterHandle) ||
    !/^0x[0-9a-fA-F]{8,40}$/.test(parts[1])
  ) {
    throw new Error("Paste a Farcaster cast URL, not a profile or feed URL.");
  }
  return `https://farcaster.xyz/${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("StudioNet returned an unexpected contract response.");
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error("StudioNet returned an invalid numeric value.");
  }
  return number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toCalldataAddress(address: string) {
  const hex = address.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error("The connected wallet returned an invalid address.");
  }
  return new CalldataAddress(
    Uint8Array.from(
      hex.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
    ),
  );
}

function assertSuccessfulExecution(
  receipt: unknown,
  transactionHash: `0x${string}`,
) {
  const outcome = genLayerExecutionOutcome(receipt);
  if (outcome === "SUCCESS") return;
  if (outcome === "FAILED") {
    throw new CredenceTransactionExecutionError(transactionHash);
  }
  throw new Error("Validator consensus did not finish successfully.");
}

export async function waitForCredenceTransaction(
  transactionHash: `0x${string}`,
) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: transactionHash as Hash,
    status: TransactionStatus.ACCEPTED,
    interval: TRANSACTION_POLL_INTERVAL_MS,
    retries: TRANSACTION_POLL_RETRIES,
  });
  assertSuccessfulExecution(receipt, transactionHash);
}

export async function readCredenceTransactionState(
  transactionHash: `0x${string}`,
): Promise<CredenceTransactionState> {
  try {
    const receipt = await readClient.waitForTransactionReceipt({
      hash: transactionHash as Hash,
      status: TransactionStatus.ACCEPTED,
      interval: 0,
      retries: 0,
    });
    if (genLayerExecutionOutcome(receipt) === "FAILED") {
      return "FAILED";
    }
    assertSuccessfulExecution(receipt, transactionHash);
    return "SUCCESS";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.startsWith("Timed out waiting for transaction") ||
      message.startsWith("Transaction not found")
    ) {
      return "PENDING";
    }
    throw error;
  }
}

export async function readChainProfile(address: string): Promise<ChainProfile> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName: "get_user_profile",
      args: [toCalldataAddress(address)],
    }),
  );
  return {
    registered: Boolean(raw.registered),
    reputation: asNumber(raw.reputation),
    availableReputation: asNumber(raw.available_reputation),
    reputationAtRisk: asNumber(raw.reputation_at_risk),
    predictionsMade: asNumber(raw.predictions_made),
    openPredictions: asNumber(raw.open_predictions),
    resolvedPredictions: asNumber(raw.resolved_predictions),
    correctPredictions: asNumber(raw.correct_predictions),
    voidPredictions: asNumber(raw.void_predictions),
    accuracyBps: asNumber(raw.accuracy_bps),
    predictionScoreBps: asNumber(raw.prediction_score_bps),
    xIdentityBound: Boolean(raw.x_identity_bound),
    xHandle: asString(raw.x_handle),
    xIdentityStatus: asString(raw.x_identity_status) as IdentityStatus,
    xVerifiedUntil: asNumber(raw.x_verified_until),
    farcasterIdentityBound: Boolean(raw.farcaster_identity_bound),
    farcasterFid: asString(raw.farcaster_fid),
    farcasterHandle: asString(raw.farcaster_handle),
    dualSourceIdentityBound: Boolean(raw.dual_source_identity_bound),
    recoveryActive: Boolean(raw.recovery_active),
    recoveryNextAt: asNumber(raw.recovery_next_at),
    recoverableReputation: asNumber(raw.recoverable_reputation),
  };
}

export async function readBindingChallenge(
  address: string,
): Promise<BindingChallenge> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName: "get_identity_challenge",
      args: [toCalldataAddress(address)],
    }),
  );
  return {
    challenge: asString(raw.challenge),
    expiresAt: asNumber(raw.expires_at),
    active: Boolean(raw.active),
    attempt: asNumber(raw.attempt),
    purpose: asString(raw.purpose) as BindingChallenge["purpose"],
  };
}

export async function readChainIdentity(address: string): Promise<ChainIdentity> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName: "get_identity_status",
      args: [toCalldataAddress(address)],
    }),
  );
  return {
    bound: Boolean(raw.bound),
    dualSourceBound: Boolean(raw.dual_source_bound),
    status: asString(raw.status) as IdentityStatus,
    handle: asString(raw.handle),
    identityId: asString(raw.identity_id),
    proofUrl: asString(raw.proof_url),
    farcasterFid: asString(raw.farcaster_fid),
    farcasterHandle: asString(raw.farcaster_handle),
    farcasterProofUrl: asString(raw.farcaster_proof_url),
    verifiedAt: asNumber(raw.verified_at),
    verifiedUntil: asNumber(raw.verified_until),
    graceUntil: asNumber(raw.grace_until),
    reverificationDue: Boolean(raw.reverification_due),
    reverificationPending: Boolean(raw.reverification_pending),
    canPredict: Boolean(raw.can_predict),
  };
}

export async function readProtocolStats(): Promise<ChainProtocolStats> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName: "get_protocol_stats",
    }),
  );
  return {
    users: asNumber(raw.users),
    markets: asNumber(raw.markets),
    predictions: asNumber(raw.predictions),
    startingReputation: asNumber(raw.starting_reputation),
    maxStakeBps: asNumber(raw.max_stake_bps),
    marketVoidTimeoutSeconds: asNumber(raw.market_void_timeout_seconds),
  };
}

export async function readChainMarket(marketId: string): Promise<ChainMarket> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName: "get_market",
      args: [marketId],
    }),
  );
  return {
    id: asString(raw.id),
    question: asString(raw.question),
    description: asString(raw.description),
    slug: asString(raw.slug),
    sourceUrl: asString(raw.source_url),
    conditionId: asString(raw.condition_id),
    settlementSource: asString(raw.settlement_source),
    endTimeUnix: asNumber(raw.end_time_unix),
    voidAfterUnix: asNumber(raw.void_after_unix),
    status: asString(raw.status) as ChainMarket["status"],
    outcome: asString(raw.outcome) as ChainMarket["outcome"],
    predictionCount: asNumber(raw.prediction_count),
    totalReputationStaked: asNumber(raw.total_reputation_staked),
  };
}

export async function readUserPositions(
  address: string,
  count: number,
): Promise<ChainPosition[]> {
  if (!count) return [];
  const positionCount = Math.min(count, 100);
  const positionOffset = Math.max(0, count - positionCount);
  const rawIds = await readClient.readContract({
    address: CREDREP_CONTRACT_ADDRESS,
    functionName: "get_user_position_ids",
    args: [toCalldataAddress(address), BigInt(positionOffset), BigInt(positionCount)],
  });
  if (!Array.isArray(rawIds)) throw new Error("StudioNet returned an invalid position index.");

  const positions = await Promise.all(
    rawIds.map(async (value) => {
      const marketId = asString(value);
      const [positionRaw, market] = await Promise.all([
        readClient.readContract({
          address: CREDREP_CONTRACT_ADDRESS,
          functionName: "get_position",
          args: [toCalldataAddress(address), marketId],
        }),
        readChainMarket(marketId),
      ]);
      const raw = asRecord(positionRaw);
      return {
        exists: Boolean(raw.exists),
        marketId,
        prediction: asString(raw.prediction) as ChainPosition["prediction"],
        confidenceBps: asNumber(raw.confidence_bps),
        stake: asNumber(raw.stake),
        status: asString(raw.status) as ChainPosition["status"],
        scoreBps: asNumber(raw.score_bps),
        createdAt: asString(raw.created_at),
        settledAt: asString(raw.settled_at),
        market,
      } satisfies ChainPosition;
    }),
  );
  return positions.reverse();
}

function ethereumProvider(): BrowserProvider {
  const provider = (window as typeof window & { ethereum?: BrowserProvider }).ethereum;
  if (!provider) throw new Error("Install MetaMask to connect a StudioNet wallet.");
  return provider;
}

export function isStudioNetChainId(value: unknown): boolean {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) return false;
  return Number.parseInt(value.slice(2), 16) === STUDIONET_CHAIN_ID;
}

export async function isStudioNetNetwork(): Promise<boolean> {
  const chainId = await ethereumProvider().request({ method: "eth_chainId" });
  return isStudioNetChainId(chainId);
}

export async function switchToStudioNet(): Promise<void> {
  const provider = ethereumProvider();
  const chainId = `0x${STUDIONET_CHAIN_ID.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: unknown }).code)
        : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: studionet.name,
          nativeCurrency: studionet.nativeCurrency,
          rpcUrls: [...studionet.rpcUrls.default.http],
          blockExplorerUrls: [STUDIONET_EXPLORER_URL],
        },
      ],
    });
  }
}

export function watchCredenceProvider(callbacks: {
  onAccountsChanged(accounts: string[]): void;
  onChainChanged(chainId: unknown): void;
}): () => void {
  let provider: BrowserProvider;
  try {
    provider = ethereumProvider();
  } catch {
    return () => undefined;
  }
  const accountsListener: ProviderListener = (value) => {
    callbacks.onAccountsChanged(
      Array.isArray(value)
        ? value.filter((account): account is string => typeof account === "string")
        : [],
    );
  };
  const chainListener: ProviderListener = (value) => callbacks.onChainChanged(value);
  provider.on?.("accountsChanged", accountsListener);
  provider.on?.("chainChanged", chainListener);
  return () => {
    provider.removeListener?.("accountsChanged", accountsListener);
    provider.removeListener?.("chainChanged", chainListener);
  };
}

export async function connectCredenceWallet(
  accountHint?: string,
): Promise<ConnectedCredenceWallet> {
  const provider = ethereumProvider();
  const accounts = accountHint
    ? [accountHint]
    : await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("No wallet account was selected.");
  }
  const address = accounts[0] as `0x${string}`;
  toCalldataAddress(address);
  if (!(await isStudioNetNetwork())) await switchToStudioNet();

  const writeClient = createClient({
    chain: studionet,
    account: address,
    provider,
  });
  await writeClient.connect("studionet");

  async function write(
    functionName: string,
    args: CalldataEncodable[] = [],
    onSubmitted?: OnSubmitted,
  ): Promise<`0x${string}`> {
    const transactionHash = (await writeClient.writeContract({
      address: CREDREP_CONTRACT_ADDRESS,
      functionName,
      args,
      value: 0n,
    })) as `0x${string}`;
    onSubmitted?.(transactionHash);
    await waitForCredenceTransaction(transactionHash);
    return transactionHash;
  }

  return {
    address,
    signIndexAuthorization: async (message) => {
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });
      if (typeof signature !== "string" || !/^0x[0-9a-f]+$/i.test(signature)) {
        throw new Error("The wallet returned an invalid signature.");
      }
      return signature as `0x${string}`;
    },
    beginIdentityBinding: (onSubmitted) =>
      write("begin_identity_binding", [], onSubmitted),
    verifyIdentityBinding: (proofUrl, farcasterProofUrl, onSubmitted) =>
      write("verify_identity_binding", [proofUrl, farcasterProofUrl], onSubmitted),
    beginIdentityReverification: (onSubmitted) =>
      write("begin_identity_reverification", [], onSubmitted),
    verifyIdentityReverification: (proofUrl, farcasterProofUrl, onSubmitted) =>
      write("verify_identity_reverification", [proofUrl, farcasterProofUrl], onSubmitted),
    startRecovery: (onSubmitted) => write("start_recovery", [], onSubmitted),
    claimRecovery: (onSubmitted) => write("claim_recovery", [], onSubmitted),
    makePrediction: (
      { marketId, prediction, confidenceBps, stake },
      onSubmitted,
    ) =>
      write(
        "make_prediction",
        [marketId, prediction, BigInt(confidenceBps), BigInt(stake)],
        onSubmitted,
      ),
    resolveMarket: (marketId, onSubmitted) =>
      write("resolve_market", [marketId], onSubmitted),
    voidStaleMarket: (marketId, onSubmitted) =>
      write("void_stale_market", [marketId], onSubmitted),
    settlePrediction: (marketId, onSubmitted) =>
      write("settle_prediction", [marketId], onSubmitted),
  };
}
