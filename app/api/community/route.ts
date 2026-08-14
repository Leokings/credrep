import { and, count, desc, eq } from "drizzle-orm";
import { chainMarkets, chainPositions, chainProfiles } from "../../../db/schema";
import { CREDENCE_CONTRACT_ADDRESS } from "../../../lib/deployment";
import type { CommunityFeed } from "../../../lib/community-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getDb } = await import("../../../db");
    const db = getDb();
    const contractAddress = CREDENCE_CONTRACT_ADDRESS.toLowerCase();

    const [profileCount, profiles, activity] = await Promise.all([
      db
        .select({ value: count() })
        .from(chainProfiles)
        .where(eq(chainProfiles.contractAddress, contractAddress)),
      db
        .select()
        .from(chainProfiles)
        .where(eq(chainProfiles.contractAddress, contractAddress))
        .orderBy(
          desc(chainProfiles.predictionScoreBps),
          desc(chainProfiles.resolvedPredictions),
          desc(chainProfiles.correctPredictions),
          desc(chainProfiles.predictionsMade),
        )
        .limit(50),
      db
        .select({
          walletAddress: chainPositions.walletAddress,
          xHandle: chainProfiles.xHandle,
          marketId: chainPositions.marketId,
          question: chainMarkets.question,
          sourceUrl: chainMarkets.sourceUrl,
          prediction: chainPositions.prediction,
          confidenceBps: chainPositions.confidenceBps,
          stake: chainPositions.stake,
          status: chainPositions.status,
          scoreBps: chainPositions.scoreBps,
          createdAt: chainPositions.createdAt,
          settledAt: chainPositions.settledAt,
        })
        .from(chainPositions)
        .innerJoin(
          chainProfiles,
          and(
            eq(chainProfiles.contractAddress, chainPositions.contractAddress),
            eq(chainProfiles.walletAddress, chainPositions.walletAddress),
          ),
        )
        .innerJoin(
          chainMarkets,
          and(
            eq(chainMarkets.contractAddress, chainPositions.contractAddress),
            eq(chainMarkets.marketId, chainPositions.marketId),
          ),
        )
        .where(eq(chainPositions.contractAddress, contractAddress))
        .orderBy(desc(chainPositions.createdAt))
        .limit(40),
    ]);

    return Response.json({
      contractAddress: CREDENCE_CONTRACT_ADDRESS,
      indexedProfiles: profileCount[0]?.value ?? 0,
      leaderboard: profiles.map((profile, index) => ({
        rank: index + 1,
        walletAddress: profile.walletAddress,
        xHandle: profile.xHandle,
        identityStatus: profile.identityStatus,
        reputation: profile.reputation,
        availableReputation: profile.availableReputation,
        reputationAtRisk: profile.reputationAtRisk,
        predictionsMade: profile.predictionsMade,
        openPredictions: profile.openPredictions,
        resolvedPredictions: profile.resolvedPredictions,
        correctPredictions: profile.correctPredictions,
        accuracyBps: profile.accuracyBps,
        predictionScoreBps: profile.predictionScoreBps,
        indexedAt: profile.indexedAt,
      })),
      activity,
    } satisfies CommunityFeed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Community feed unavailable.";
    return Response.json({ error: message }, { status: 503 });
  }
}
