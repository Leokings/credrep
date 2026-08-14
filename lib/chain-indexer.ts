import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { CalldataAddress } from "genlayer-js/types";
import { chainMarkets, chainPositions, chainProfiles } from "../db/schema";
import { CREDENCE_CONTRACT_ADDRESS } from "./deployment";

const readClient = createClient({ chain: testnetBradbury });
const CONTRACT_KEY = CREDENCE_CONTRACT_ADDRESS.toLowerCase();
const MAX_INDEXED_POSITIONS = 100;

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

export function normalizeWalletAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw new Error("Enter a valid EVM wallet address.");
  }
  return normalized;
}

function toCalldataAddress(address: string) {
  const hex = normalizeWalletAddress(address).slice(2);
  return new CalldataAddress(
    Uint8Array.from(
      hex.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
    ),
  );
}

export async function indexBradburyWallet(address: string) {
  const walletAddress = normalizeWalletAddress(address);
  const calldataAddress = toCalldataAddress(walletAddress);
  const profile = asRecord(
    await readClient.readContract({
      address: CREDENCE_CONTRACT_ADDRESS,
      functionName: "get_user_profile",
      args: [calldataAddress],
    }),
  );

  if (!profile.registered) {
    return { indexed: false, positions: 0, truncated: false };
  }

  const predictionsMade = asNumber(profile.predictions_made);
  const positionCount = Math.min(predictionsMade, MAX_INDEXED_POSITIONS);
  const positionOffset = Math.max(0, predictionsMade - positionCount);
  const rawIds = positionCount
    ? await readClient.readContract({
        address: CREDENCE_CONTRACT_ADDRESS,
        functionName: "get_user_position_ids",
        args: [calldataAddress, BigInt(positionOffset), BigInt(positionCount)],
      })
    : [];

  if (!Array.isArray(rawIds)) {
    throw new Error("Bradbury returned an invalid position index.");
  }

  const positions = await Promise.all(
    rawIds.map(async (rawId) => {
      const marketId = asString(rawId);
      if (!marketId) throw new Error("Bradbury returned an invalid market ID.");
      const [rawPosition, rawMarket] = await Promise.all([
        readClient.readContract({
          address: CREDENCE_CONTRACT_ADDRESS,
          functionName: "get_position",
          args: [calldataAddress, marketId],
        }),
        readClient.readContract({
          address: CREDENCE_CONTRACT_ADDRESS,
          functionName: "get_market",
          args: [marketId],
        }),
      ]);
      return {
        position: asRecord(rawPosition),
        market: asRecord(rawMarket),
        marketId,
      };
    }),
  );

  const indexedAt = new Date().toISOString();
  const { getDb } = await import("../db");
  const db = getDb();

  await db
    .insert(chainProfiles)
    .values({
      contractAddress: CONTRACT_KEY,
      walletAddress,
      xHandle: asString(profile.x_handle),
      identityStatus: asString(profile.x_identity_status),
      xVerifiedUntil: asNumber(profile.x_verified_until),
      reputation: asNumber(profile.reputation),
      availableReputation: asNumber(profile.available_reputation),
      reputationAtRisk: asNumber(profile.reputation_at_risk),
      predictionsMade,
      openPredictions: asNumber(profile.open_predictions),
      resolvedPredictions: asNumber(profile.resolved_predictions),
      correctPredictions: asNumber(profile.correct_predictions),
      voidPredictions: asNumber(profile.void_predictions),
      accuracyBps: asNumber(profile.accuracy_bps),
      predictionScoreBps: asNumber(profile.prediction_score_bps),
      indexedAt,
    })
    .onConflictDoUpdate({
      target: [chainProfiles.contractAddress, chainProfiles.walletAddress],
      set: {
        xHandle: asString(profile.x_handle),
        identityStatus: asString(profile.x_identity_status),
        xVerifiedUntil: asNumber(profile.x_verified_until),
        reputation: asNumber(profile.reputation),
        availableReputation: asNumber(profile.available_reputation),
        reputationAtRisk: asNumber(profile.reputation_at_risk),
        predictionsMade,
        openPredictions: asNumber(profile.open_predictions),
        resolvedPredictions: asNumber(profile.resolved_predictions),
        correctPredictions: asNumber(profile.correct_predictions),
        voidPredictions: asNumber(profile.void_predictions),
        accuracyBps: asNumber(profile.accuracy_bps),
        predictionScoreBps: asNumber(profile.prediction_score_bps),
        indexedAt,
      },
    });

  await Promise.all(
    positions.map(async ({ position, market, marketId }) => {
      if (!position.exists) return;
      await db
        .insert(chainMarkets)
        .values({
          contractAddress: CONTRACT_KEY,
          marketId,
          question: asString(market.question),
          description: asString(market.description),
          slug: asString(market.slug),
          sourceUrl: asString(market.source_url),
          endTimeUnix: asNumber(market.end_time_unix),
          status: asString(market.status),
          outcome: asString(market.outcome),
          predictionCount: asNumber(market.prediction_count),
          totalReputationStaked: asNumber(market.total_reputation_staked),
          indexedAt,
        })
        .onConflictDoUpdate({
          target: [chainMarkets.contractAddress, chainMarkets.marketId],
          set: {
            question: asString(market.question),
            description: asString(market.description),
            slug: asString(market.slug),
            sourceUrl: asString(market.source_url),
            endTimeUnix: asNumber(market.end_time_unix),
            status: asString(market.status),
            outcome: asString(market.outcome),
            predictionCount: asNumber(market.prediction_count),
            totalReputationStaked: asNumber(market.total_reputation_staked),
            indexedAt,
          },
        });

      await db
        .insert(chainPositions)
        .values({
          contractAddress: CONTRACT_KEY,
          walletAddress,
          marketId,
          prediction: asString(position.prediction),
          confidenceBps: asNumber(position.confidence_bps),
          stake: asNumber(position.stake),
          status: asString(position.status),
          scoreBps: asNumber(position.score_bps),
          createdAt: asString(position.created_at),
          settledAt: asString(position.settled_at),
          indexedAt,
        })
        .onConflictDoUpdate({
          target: [
            chainPositions.contractAddress,
            chainPositions.walletAddress,
            chainPositions.marketId,
          ],
          set: {
            prediction: asString(position.prediction),
            confidenceBps: asNumber(position.confidence_bps),
            stake: asNumber(position.stake),
            status: asString(position.status),
            scoreBps: asNumber(position.score_bps),
            createdAt: asString(position.created_at),
            settledAt: asString(position.settled_at),
            indexedAt,
          },
        });
    }),
  );

  return {
    indexed: true,
    positions: positions.length,
    truncated: predictionsMade > MAX_INDEXED_POSITIONS,
    indexedAt,
  };
}
