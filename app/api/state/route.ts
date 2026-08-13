import { desc, eq, ne, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { ensureProfile, ensureSeedData } from "../../../db/bootstrap";
import { claims, profiles } from "../../../db/schema";

export const dynamic = "force-dynamic";

function asAccuracy(correct: number, resolved: number) {
  return resolved ? Math.round((correct / resolved) * 100) : 0;
}

function strongestCategory(userId: string) {
  if (userId === "seed-kwame") return "Football";
  if (userId === "seed-lena") return "Economy";
  if (userId === "seed-omi") return "Crypto";
  return "Technology";
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to load your reputation ledger." },
      { status: 401 },
    );
  }

  try {
    const db = getDb();
    await ensureSeedData(db);
    const profile = await ensureProfile(db, user);
    const reputationExpression = sql<number>`${profiles.credits} + ${profiles.atRisk}`;

    const [claimRows, leaderRows, rankRows] = await Promise.all([
      db
        .select({
          id: claims.id,
          ownerId: claims.userId,
          ownerName: profiles.displayName,
          ownerHandle: profiles.handle,
          statement: claims.statement,
          category: claims.category,
          status: claims.status,
          stake: claims.stake,
          resolutionAt: claims.resolutionAt,
          sourceLabel: claims.sourceLabel,
          sourceUrl: claims.sourceUrl,
          rules: claims.rules,
          createdAt: claims.createdAt,
          outcome: claims.outcome,
        })
        .from(claims)
        .innerJoin(profiles, eq(claims.userId, profiles.userId))
        .orderBy(desc(claims.createdAt)),
      db
        .select()
        .from(profiles)
        .where(ne(profiles.userId, user.userId))
        .orderBy(desc(reputationExpression))
        .limit(4),
      db
        .select({ userId: profiles.userId })
        .from(profiles)
        .orderBy(desc(reputationExpression)),
    ]);

    const rankIndex = rankRows.findIndex((row) => row.userId === user.userId);
    return Response.json({
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        handle: profile.handle,
        reputation: profile.credits + profile.atRisk,
        availableReputation: profile.credits,
        reputationAtRisk: profile.atRisk,
        totalClaims: profile.totalClaims,
        resolvedClaims: profile.resolvedClaims,
        correctClaims: profile.correctClaims,
        rank: rankIndex >= 0 ? rankIndex + 1 : null,
      },
      claims: claimRows,
      leaderboard: leaderRows.map((leader) => {
        const reputation = leader.credits + leader.atRisk;
        return {
          userId: leader.userId,
          displayName: leader.displayName,
          handle: leader.handle,
          reputation,
          atRisk: leader.atRisk,
          category: strongestCategory(leader.userId),
          accuracy: asAccuracy(
            leader.correctClaims,
            leader.resolvedClaims,
          ),
          resolved: leader.resolvedClaims,
          delta: reputation - 100,
        };
      }),
      ledgerMode: "indexed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load data";
    return Response.json({ error: message }, { status: 500 });
  }
}
