"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  CalldataAddress,
  ExecutionResult,
  TransactionStatus,
} from "genlayer-js/types";
import { CREDENCE_CONTRACT_ADDRESS } from "./deployment";

type BrowserProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

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
  status: IdentityStatus;
  handle: string;
  identityId: string;
  proofUrl: string;
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
};

export type ChainMarket = {
  id: string;
  question: string;
  description: string;
  slug: string;
  sourceUrl: string;
  endTimeUnix: number;
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
  beginXBinding(): Promise<`0x${string}`>;
  verifyXBinding(proofUrl: string): Promise<`0x${string}`>;
  beginXReverification(): Promise<`0x${string}`>;
  verifyXReverification(proofUrl: string): Promise<`0x${string}`>;
  startRecovery(): Promise<`0x${string}`>;
  claimRecovery(): Promise<`0x${string}`>;
  makePrediction(input: {
    marketId: string;
    prediction: "YES" | "NO";
    confidenceBps: number;
    stake: number;
  }): Promise<`0x${string}`>;
  resolveMarket(marketId: string): Promise<`0x${string}`>;
  settlePrediction(marketId: string): Promise<`0x${string}`>;
};

const readClient = createClient({ chain: testnetBradbury });

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Bradbury returned an unexpected contract response.");
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error("Bradbury returned an invalid numeric value.");
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

function assertSuccessfulExecution(receipt: { txExecutionResultName?: string }) {
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(
      receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR
        ? "The contract rejected this transaction. No reputation changed."
        : "Validator consensus did not finish successfully.",
    );
  }
}

async function waitForAccepted(transactionHash: `0x${string}`) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: transactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 1_500,
    retries: 160,
  });
  assertSuccessfulExecution(receipt);
}

export async function readChainProfile(address: string): Promise<ChainProfile> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDENCE_CONTRACT_ADDRESS,
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
      address: CREDENCE_CONTRACT_ADDRESS,
      functionName: "get_binding_challenge",
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
      address: CREDENCE_CONTRACT_ADDRESS,
      functionName: "get_identity_status",
      args: [toCalldataAddress(address)],
    }),
  );
  return {
    bound: Boolean(raw.bound),
    status: asString(raw.status) as IdentityStatus,
    handle: asString(raw.handle),
    identityId: asString(raw.identity_id),
    proofUrl: asString(raw.proof_url),
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
      address: CREDENCE_CONTRACT_ADDRESS,
      functionName: "get_protocol_stats",
    }),
  );
  return {
    users: asNumber(raw.users),
    markets: asNumber(raw.markets),
    predictions: asNumber(raw.predictions),
    startingReputation: asNumber(raw.starting_reputation),
    maxStakeBps: asNumber(raw.max_stake_bps),
  };
}

export async function readChainMarket(marketId: string): Promise<ChainMarket> {
  const raw = asRecord(
    await readClient.readContract({
      address: CREDENCE_CONTRACT_ADDRESS,
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
    endTimeUnix: asNumber(raw.end_time_unix),
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
  const rawIds = await readClient.readContract({
    address: CREDENCE_CONTRACT_ADDRESS,
    functionName: "get_user_position_ids",
    args: [toCalldataAddress(address), 0n, BigInt(Math.min(count, 100))],
  });
  if (!Array.isArray(rawIds)) throw new Error("Bradbury returned an invalid position index.");

  const positions = await Promise.all(
    rawIds.map(async (value) => {
      const marketId = asString(value);
      const [positionRaw, market] = await Promise.all([
        readClient.readContract({
          address: CREDENCE_CONTRACT_ADDRESS,
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
  if (!provider) throw new Error("Install MetaMask to connect a Bradbury wallet.");
  return provider;
}

export async function connectCredenceWallet(): Promise<ConnectedCredenceWallet> {
  const provider = ethereumProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("No wallet account was selected.");
  }
  const address = accounts[0] as `0x${string}`;
  toCalldataAddress(address);

  const writeClient = createClient({
    chain: testnetBradbury,
    account: address,
    provider,
  });
  await writeClient.connect("testnetBradbury");

  async function write(
    functionName: string,
    args: unknown[] = [],
  ): Promise<`0x${string}`> {
    const transactionHash = (await writeClient.writeContract({
      address: CREDENCE_CONTRACT_ADDRESS,
      functionName,
      args,
      value: 0n,
    })) as `0x${string}`;
    await waitForAccepted(transactionHash);
    return transactionHash;
  }

  return {
    address,
    beginXBinding: () => write("begin_x_binding"),
    verifyXBinding: (proofUrl) => write("verify_x_binding", [proofUrl]),
    beginXReverification: () => write("begin_x_reverification"),
    verifyXReverification: (proofUrl) =>
      write("verify_x_reverification", [proofUrl]),
    startRecovery: () => write("start_recovery"),
    claimRecovery: () => write("claim_recovery"),
    makePrediction: ({ marketId, prediction, confidenceBps, stake }) =>
      write("make_prediction", [
        marketId,
        prediction,
        BigInt(confidenceBps),
        BigInt(stake),
      ]),
    resolveMarket: (marketId) => write("resolve_market", [marketId]),
    settlePrediction: (marketId) => write("settle_prediction", [marketId]),
  };
}
