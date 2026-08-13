import { eq } from "drizzle-orm";
import type { getDb } from ".";
import { SEED_LEADERS, SEED_MARKETS } from "../lib/product-data";
import { markets, profiles } from "./schema";

type Database = ReturnType<typeof getDb>;

function seededHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

export async function ensureSeedData(db: Database) {
  for (const market of SEED_MARKETS) {
    await db
      .insert(markets)
      .values({
        id: market.id,
        eyebrow: market.eyebrow,
        question: market.question,
        category: market.category,
        status: market.status,
        lockAt: market.lockAt,
        resolutionAt: market.resolutionAt,
        sourceLabel: market.sourceLabel,
        rules: market.rules,
        yesProbabilityBps: market.yesProbability * 100,
        volume: market.volume,
        forecasters: market.forecasters,
        signal: market.signal,
      })
      .onConflictDoNothing();
  }

  for (const leader of SEED_LEADERS) {
    await db
      .insert(profiles)
      .values({
        userId: leader.userId,
        displayName: leader.displayName,
        handle: seededHandle(leader.handle),
        credits: 100 + Math.max(0, leader.delta),
        overallRating: leader.rating,
        totalForecasts: leader.resolved,
        resolvedForecasts: leader.resolved,
        correctForecasts: Math.round((leader.resolved * leader.accuracy) / 100),
        brierTotal: Math.round(leader.resolved * 1_640),
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
  if (existing[0]) return existing[0];

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
