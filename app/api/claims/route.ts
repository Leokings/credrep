import { eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { ensureProfile, ensureSeedData } from "../../../db/bootstrap";
import { claims, profiles } from "../../../db/schema";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set([
  "Economy",
  "Football",
  "Technology",
  "Crypto",
  "Politics",
  "Science",
  "Other",
]);

type ClaimPayload = {
  statement?: string;
  category?: string;
  stake?: number;
  resolutionAt?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  rules?: string;
};

function cleanText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in before backing a claim." },
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json()) as ClaimPayload;
    const statement = cleanText(payload.statement);
    const category = cleanText(payload.category);
    const sourceLabel = cleanText(payload.sourceLabel);
    const sourceUrl = cleanText(payload.sourceUrl);
    const rules = cleanText(payload.rules);
    const stake = Math.round(Number(payload.stake));
    const resolutionAt = new Date(payload.resolutionAt ?? "");

    if (statement.length < 20 || statement.length > 280) {
      return Response.json(
        { error: "Your claim must be between 20 and 280 characters." },
        { status: 400 },
      );
    }
    if (!CATEGORIES.has(category)) {
      return Response.json({ error: "Choose a valid category." }, { status: 400 });
    }
    if (!Number.isFinite(stake) || stake < 1) {
      return Response.json(
        { error: "Put at least one reputation point at risk." },
        { status: 400 },
      );
    }
    if (
      Number.isNaN(resolutionAt.getTime()) ||
      resolutionAt.getTime() < Date.now() + 60 * 60 * 1000 ||
      resolutionAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000
    ) {
      return Response.json(
        { error: "Choose a resolution time between one hour and one year away." },
        { status: 400 },
      );
    }
    if (sourceLabel.length < 3 || sourceLabel.length > 80) {
      return Response.json(
        { error: "Name the evidence source in 3 to 80 characters." },
        { status: 400 },
      );
    }
    let parsedSource: URL;
    try {
      parsedSource = new URL(sourceUrl);
    } catch {
      return Response.json({ error: "Enter a valid HTTPS evidence URL." }, { status: 400 });
    }
    if (parsedSource.protocol !== "https:" || sourceUrl.length > 300) {
      return Response.json({ error: "Enter a valid HTTPS evidence URL." }, { status: 400 });
    }
    if (rules.length < 20 || rules.length > 1_000) {
      return Response.json(
        { error: "Resolution rules must be between 20 and 1,000 characters." },
        { status: 400 },
      );
    }

    const db = getDb();
    await ensureSeedData(db);
    const profile = await ensureProfile(db, user);
    const maximumStake = Math.max(1, Math.floor(profile.credits * 0.2));
    if (stake > maximumStake) {
      return Response.json(
        { error: `Your maximum stake is ${maximumStake} reputation points.` },
        { status: 400 },
      );
    }
    if (stake > profile.credits) {
      return Response.json(
        { error: "You do not have enough available reputation." },
        { status: 400 },
      );
    }

    const id = `claim-${crypto.randomUUID()}`;
    const [claim] = await db
      .insert(claims)
      .values({
        id,
        userId: user.userId,
        statement,
        category,
        stake,
        resolutionAt: resolutionAt.toISOString(),
        sourceLabel,
        sourceUrl,
        rules,
      })
      .returning();

    await db
      .update(profiles)
      .set({
        credits: sql`${profiles.credits} - ${stake}`,
        atRisk: sql`${profiles.atRisk} + ${stake}`,
        totalClaims: sql`${profiles.totalClaims} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(profiles.userId, user.userId));

    return Response.json(
      {
        claim: {
          id: claim.id,
          ownerId: user.userId,
          ownerName: user.displayName,
          ownerHandle: profile.handle,
          statement: claim.statement,
          category: claim.category,
          status: claim.status,
          stake: claim.stake,
          resolutionAt: claim.resolutionAt,
          sourceLabel: claim.sourceLabel,
          sourceUrl: claim.sourceUrl,
          rules: claim.rules,
          createdAt: claim.createdAt,
          outcome: claim.outcome,
        },
        availableReputation: profile.credits - stake,
        reputationAtRisk: profile.atRisk + stake,
        mode: "preview-ledger",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record claim";
    return Response.json({ error: message }, { status: 500 });
  }
}
