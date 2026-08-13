import { asc, desc, eq, ne } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { ensureProfile, ensureSeedData } from "../../../db/bootstrap";
import { forecasts, markets, profiles } from "../../../db/schema";

export const dynamic = "force-dynamic";

function asAccuracy(correct: number, resolved: number) {
  return resolved ? Math.round((correct / resolved) * 100) : 0;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to load your forecasting ledger." },
      { status: 401 },
    );
  }

  try {
    const db = getDb();
    await ensureSeedData(db);
    const profile = await ensureProfile(db, user);

    const [marketRows, leaderRows, forecastRows, rankRows] = await Promise.all([
      db.select().from(markets).orderBy(asc(markets.lockAt)),
      db
        .select()
        .from(profiles)
        .where(ne(profiles.userId, user.userId))
        .orderBy(desc(profiles.overallRating))
        .limit(4),
      db
        .select()
        .from(forecasts)
        .where(eq(forecasts.userId, user.userId))
        .orderBy(desc(forecasts.createdAt)),
      db
        .select({ userId: profiles.userId })
        .from(profiles)
        .orderBy(desc(profiles.overallRating)),
    ]);

    const rankIndex = rankRows.findIndex((row) => row.userId === user.userId);
    return Response.json({
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        handle: profile.handle,
        credits: profile.credits,
        overallRating: profile.overallRating,
        totalForecasts: profile.totalForecasts,
        resolvedForecasts: profile.resolvedForecasts,
        correctForecasts: profile.correctForecasts,
        averageBrier: profile.resolvedForecasts
          ? Math.round(profile.brierTotal / profile.resolvedForecasts)
          : null,
        rank: rankIndex >= 0 ? rankIndex + 1 : null,
      },
      markets: marketRows.map((market) => ({
        id: market.id,
        eyebrow: market.eyebrow,
        question: market.question,
        category: market.category,
        status: market.status,
        lockAt: market.lockAt,
        resolutionAt: market.resolutionAt,
        sourceLabel: market.sourceLabel,
        rules: market.rules,
        yesProbability: Math.round(market.yesProbabilityBps / 100),
        volume: market.volume,
        forecasters: market.forecasters,
        signal: market.signal,
      })),
      leaderboard: leaderRows.map((leader) => ({
        userId: leader.userId,
        displayName: leader.displayName,
        handle: leader.handle,
        rating: leader.overallRating,
        category:
          leader.userId === "seed-kwame"
            ? "Football"
            : leader.userId === "seed-lena"
              ? "Economy"
              : leader.userId === "seed-omi"
                ? "Crypto"
                : "Technology",
        accuracy: asAccuracy(leader.correctForecasts, leader.resolvedForecasts),
        resolved: leader.resolvedForecasts,
        delta: leader.userId === "seed-omi" ? -3 : 7,
      })),
      userForecasts: forecastRows.map((forecast) => ({
        marketId: forecast.marketId,
        outcome: forecast.outcome,
        confidence:
          forecast.outcome === "YES"
            ? Math.round(forecast.yesProbabilityBps / 100)
            : Math.round((10_000 - forecast.yesProbabilityBps) / 100),
        stake: forecast.stake,
        status: forecast.status,
      })),
      ledgerMode: "indexed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load data";
    return Response.json({ error: message }, { status: 500 });
  }
}
