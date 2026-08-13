import { eq } from "drizzle-orm";
import type { getDb } from ".";
import { SEED_CLAIMS, SEED_LEADERS } from "../lib/product-data";
import { claims, profiles } from "./schema";

type Database = ReturnType<typeof getDb>;

function seededHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

export async function ensureSeedData(db: Database) {
  for (const leader of SEED_LEADERS) {
    const openClaims = SEED_CLAIMS.filter(
      (claim) => claim.ownerId === leader.userId,
    ).length;
    await db
      .insert(profiles)
      .values({
        userId: leader.userId,
        displayName: leader.displayName,
        handle: seededHandle(leader.handle),
        credits: leader.reputation - leader.atRisk,
        atRisk: leader.atRisk,
        overallRating: leader.reputation,
        totalClaims: leader.resolved + openClaims,
        resolvedClaims: leader.resolved,
        correctClaims: Math.round((leader.resolved * leader.accuracy) / 100),
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          displayName: leader.displayName,
          handle: seededHandle(leader.handle),
          credits: leader.reputation - leader.atRisk,
          atRisk: leader.atRisk,
          overallRating: leader.reputation,
          totalClaims: leader.resolved + openClaims,
          resolvedClaims: leader.resolved,
          correctClaims: Math.round((leader.resolved * leader.accuracy) / 100),
        },
      });
  }

  for (const claim of SEED_CLAIMS) {
    await db
      .insert(claims)
      .values({
        id: claim.id,
        userId: claim.ownerId,
        statement: claim.statement,
        category: claim.category,
        status: claim.status,
        stake: claim.stake,
        resolutionAt: claim.resolutionAt,
        sourceLabel: claim.sourceLabel,
        sourceUrl: claim.sourceUrl,
        rules: claim.rules,
        outcome: claim.outcome,
        createdAt: claim.createdAt,
      })
      .onConflictDoNothing();
  }
}

export async function ensureProfile(
  db: Database,
  user: { userId: string; displayName: string; email: string },
) {
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);
  if (existing[0]) {
    if (existing[0].totalClaims === 0 && existing[0].totalForecasts > 0) {
      const [migrated] = await db
        .update(profiles)
        .set({ credits: 100, atRisk: 0, totalForecasts: 0 })
        .where(eq(profiles.userId, user.userId))
        .returning();
      return migrated;
    }
    return existing[0];
  }

  const rawHandle = user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  const handle = `@${(rawHandle || "forecaster").slice(0, 20)}_${user.userId.slice(-4)}`;
  const [created] = await db
    .insert(profiles)
    .values({
      userId: user.userId,
      displayName: user.displayName,
      handle,
    })
    .returning();
  return created;
}
