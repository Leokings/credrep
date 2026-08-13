import { and, eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { ensureProfile, ensureSeedData } from "../../../db/bootstrap";
import { forecasts, markets, profiles } from "../../../db/schema";

export const dynamic = "force-dynamic";

type ForecastPayload = {
  marketId?: string;
  outcome?: string;
  confidence?: number;
  stake?: number;
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in before placing a forecast." },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json()) as ForecastPayload;
    const marketId = payload.marketId?.trim() ?? "";
    const outcome = payload.outcome?.trim().toUpperCase() ?? "";
    const confidence = Math.round(Number(payload.confidence));
    const stake = Math.round(Number(payload.stake));

    if (!marketId) {
      return Response.json({ error: "Choose a market." }, { status: 400 });
    }
    if (outcome !== "YES" && outcome !== "NO") {
      return Response.json({ error: "Choose YES or NO." }, { status: 400 });
    }
    if (!Number.isFinite(confidence) || confidence < 50 || confidence > 99) {
      return Response.json(
        { error: "Confidence must be between 50% and 99%." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(stake) || stake < 1) {
      return Response.json(
        { error: "Stake at least one credit." },
        { status: 400 },
      );
    }

    const db = getDb();
    await ensureSeedData(db);
    const profile = await ensureProfile(db, user);
    const [market] = await db
      .select()
      .from(markets)
      .where(eq(markets.id, marketId))
      .limit(1);
    if (!market || market.status !== "OPEN") {
      return Response.json({ error: "That market is not open." }, { status: 409 });
    }
    if (Date.parse(market.lockAt) <= Date.now()) {
      return Response.json({ error: "Forecasting has closed." }, { status: 409 });
    }

    const maximumStake = Math.max(1, Math.floor(profile.credits * 0.2));
    if (stake > maximumStake) {
      return Response.json(
        { error: `Your maximum stake is ${maximumStake} credits.` },
        { status: 400 },
      );
    }
    if (stake > profile.credits) {
      return Response.json({ error: "Insufficient credits." }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: forecasts.id })
      .from(forecasts)
      .where(
        and(
          eq(forecasts.marketId, marketId),
          eq(forecasts.userId, user.userId),
        ),
      )
      .limit(1);
    if (existing) {
      return Response.json(
        { error: "You already forecast this market." },
        { status: 409 },
      );
    }

    const yesProbabilityBps =
      outcome === "YES" ? confidence * 100 : (100 - confidence) * 100;
    const [forecast] = await db
      .insert(forecasts)
      .values({
        marketId,
        userId: user.userId,
        outcome,
        confidenceBps: confidence * 100,
        yesProbabilityBps,
        stake,
      })
      .returning();

    await db.batch([
      db
        .update(profiles)
        .set({
          credits: sql`${profiles.credits} - ${stake}`,
          totalForecasts: sql`${profiles.totalForecasts} + 1`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(profiles.userId, user.userId)),
      db
        .update(markets)
        .set({
          volume: sql`${markets.volume} + ${stake}`,
          forecasters: sql`${markets.forecasters} + 1`,
        })
        .where(eq(markets.id, marketId)),
    ]);

    return Response.json(
      {
        forecast: {
          marketId: forecast.marketId,
          outcome: forecast.outcome,
          confidence,
          stake: forecast.stake,
          status: forecast.status,
        },
        credits: profile.credits - stake,
        mode: "preview-ledger",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place forecast";
    return Response.json({ error: message }, { status: 500 });
  }
}
