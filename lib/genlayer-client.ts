"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  CalldataAddress,
  ExecutionResult,
  TransactionStatus,
} from "genlayer-js/types";
import type { ClaimInput, ClaimOutcome, ClaimStatus } from "./product-data";
import { CREDENCE_CONTRACT_ADDRESS } from "./deployment";

type BrowserProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

export type ChainProfile = {
  registered: boolean;
  reputation: number;
  availableReputation: number;
  reputationAtRisk: number;
  claimsMade: number;
  openClaims: number;
  resolvedClaims: number;
  correctClaims: number;
  voidClaims: number;
  accuracyBps: number;
  xIdentityBound: boolean;
  xIdentityId: string;
  xHandle: string;
  xIdentityStatus: IdentityStatus;
  xVerifiedAt: number;
  xVerifiedUntil: number;
  recoveryActive: boolean;
  recoveryNextAt: number;
  recoverableReputation: number;
  recoveredReputation: number;
};

export type IdentityStatus =
  | "UNBOUND"
  | "PENDING"
  | "VERIFIED"
  | "GRACE"
  | "STALE";

export type BindingChallenge = {
  challenge: string;
  expiresAt: number;
  active: boolean;
  attempt: number;
};

export type ChainIdentity = {
  bound: boolean;
  status: IdentityStatus;
  handle: string;
  identityId: string;
  proofUrl: string;
  challenge: string;
  verifiedAt: number;
  verifiedUntil: number;
  graceUntil: number;
  refreshDue: boolean;
  canClaim: boolean;
};

export type ChainProtocolStats = {
  users: number;
  claims: number;
  startingReputation: number;
  maxStakeBps: number;
  totalBonusMinted: number;
  totalReputationBurned: number;
  totalReputationRecovered: number;
  recoveryTriggerBelow: number;
  recoveryTarget: number;
  xVerificationValiditySeconds: number;
  xVerificationGraceSeconds: number;
};

export type ChainClaim = {
  id: string;
  owner: `0x${string}`;
  statement: string;
  category: string;
  resolutionRules: string;
  sources: string[];
  resolveTimeUnix: number;
  stake: number;
  status: ClaimStatus;
  outcome: ClaimOutcome | null;
  createdAt: string;
  resolvedAt: string;
};

export type ConnectedCredenceWallet = {
  address: `0x${string}`;
  beginXBinding(): Promise<`0x${string}`>;
  verifyXBinding(proofUrl: string): Promise<`0x${string}`>;
  refreshXIdentity(): Promise<`0x${string}`>;
  replaceXProof(proofUrl: string): Promise<`0x${string}`>;
  startRecovery(): Promise<`0x${string}`>;
  claimRecovery(): Promise<`0x${string}`>;
  makeClaim(input: ClaimInput): Promise<{
    claimId: string;
    transactionHash: `0x${string}`;
  }>;
};

const readClient = createClient({ chain: testnetBradbury });

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Bradbury returned an unexpected contract response.");
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  const number = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error("Bradbury returned an invalid reputation value.");
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
  const bytes = Uint8Array.from(
    hex.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
  );
  return new CalldataAddress(bytes);
}

function assertSuccessfulExecution(receipt: { txExecutionResultName?: string }) {
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(
      receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR
        ? "The contract rejected this transaction. Your reputation was not changed."
        : "Validator consensus completed without a successful contract execution.",
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
    claimsMade: asNumber(raw.claims_made),
    openClaims: asNumber(raw.open_claims),
    resolvedClaims: asNumber(raw.resolved_claims),
    correctClaims: asNumber(raw.correct_claims),
    voidClaims: asNumber(raw.void_claims),
    accuracyBps: asNumber(raw.accuracy_bps),
    xIdentityBound: Boolean(raw.x_identity_bound),
    xIdentityId: asString(raw.x_identity_id),
    xHandle: asString(raw.x_handle),
    xIdentityStatus: asString(raw.x_identity_status) as IdentityStatus,
    xVerifiedAt: asNumber(raw.x_verified_at),
    xVerifiedUntil: asNumber(raw.x_verified_until),
    recoveryActive: Boolean(raw.recovery_active),
    recoveryNextAt: asNumber(raw.recovery_next_at),
    recoverableReputation: asNumber(raw.recoverable_reputation),
    recoveredReputation: asNumber(raw.recovered_reputation),
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
  };
}

export async function readChainIdentity(
  address: string,
): Promise<ChainIdentity> {
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
    challenge: asString(raw.challenge),
    verifiedAt: asNumber(raw.verified_at),
    verifiedUntil: asNumber(raw.verified_until),
    graceUntil: asNumber(raw.grace_until),
    refreshDue: Boolean(raw.refresh_due),
    canClaim: Boolean(raw.can_claim),
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
    claims: asNumber(raw.claims),
    startingReputation: asNumber(raw.starting_reputation),
    maxStakeBps: asNumber(raw.max_stake_bps),
    totalBonusMinted: asNumber(raw.total_bonus_minted),
    totalReputationBurned: asNumber(raw.total_reputation_burned),
    totalReputationRecovered: asNumber(raw.total_reputation_recovered),
    recoveryTriggerBelow: asNumber(raw.recovery_trigger_below),
    recoveryTarget: asNumber(raw.recovery_target),
    xVerificationValiditySeconds: asNumber(
      raw.x_verification_validity_seconds,
    ),
    xVerificationGraceSeconds: asNumber(
      raw.x_verification_grace_seconds,
    ),
  };
}

export async function readChainClaims(limit = 100): Promise<ChainClaim[]> {
  const stats = await readProtocolStats();
  const count = Math.min(limit, stats.claims);
  if (count === 0) return [];

  const rawIds = await readClient.readContract({
    address: CREDENCE_CONTRACT_ADDRESS,
    functionName: "get_claim_ids",
    args: [BigInt(Math.max(0, stats.claims - count)), BigInt(count)],
  });
  if (!Array.isArray(rawIds)) {
    throw new Error("Bradbury returned an invalid claim index.");
  }

  const claims = await Promise.all(
    rawIds.map(async (rawId) => {
      const id = asString(rawId);
      const raw = asRecord(
        await readClient.readContract({
          address: CREDENCE_CONTRACT_ADDRESS,
          functionName: "get_claim",
          args: [id],
        }),
      );
      const status = asString(raw.status) as ClaimStatus;
      const outcomeValue = asString(raw.outcome);
      return {
        id,
        owner: asString(raw.owner) as `0x${string}`,
        statement: asString(raw.statement),
        category: asString(raw.category),
        resolutionRules: asString(raw.resolution_rules),
        sources: Array.isArray(raw.sources)
          ? raw.sources.map((source) => asString(source)).filter(Boolean)
          : [],
        resolveTimeUnix: asNumber(raw.resolve_time_unix),
        stake: asNumber(raw.stake),
        status,
        outcome: outcomeValue ? (outcomeValue as ClaimOutcome) : null,
        createdAt: asString(raw.created_at),
        resolvedAt: asString(raw.resolved_at),
      } satisfies ChainClaim;
    }),
  );
  return claims.reverse();
}

function ethereumProvider(): BrowserProvider {
  const provider = (window as typeof window & { ethereum?: BrowserProvider })
    .ethereum;
  if (!provider) {
    throw new Error(
      "MetaMask is required to sign a personal reputation claim on Bradbury.",
    );
  }
  return provider;
}

function makeClaimId(address: string) {
  return `c-${address.slice(2, 10).toLowerCase()}-${Date.now().toString(36)}`;
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
    beginXBinding() {
      return write("begin_x_binding");
    },
    verifyXBinding(proofUrl) {
      return write("verify_x_binding", [proofUrl]);
    },
    refreshXIdentity() {
      return write("refresh_x_identity", [toCalldataAddress(address)]);
    },
    replaceXProof(proofUrl) {
      return write("replace_x_proof", [proofUrl]);
    },
    startRecovery() {
      return write("start_recovery");
    },
    claimRecovery() {
      return write("claim_recovery");
    },
    async makeClaim(input) {
      const claimId = makeClaimId(address);
      const transactionHash = (await writeClient.writeContract({
        address: CREDENCE_CONTRACT_ADDRESS,
        functionName: "make_claim",
        args: [
          claimId,
          input.statement,
          input.category,
          input.rules,
          JSON.stringify([input.sourceUrl]),
          BigInt(Math.floor(new Date(input.resolutionAt).getTime() / 1_000)),
          BigInt(input.stake),
        ],
        value: 0n,
      })) as `0x${string}`;
      await waitForAccepted(transactionHash);
      return { claimId, transactionHash };
    },
  };
}
