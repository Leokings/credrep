import { desc, gt } from "drizzle-orm";
import { sourcedMarkets } from "../../../db/schema";
import { fetchPolymarketFeed } from "../../../lib/polymarket";
import type { MarketCategory, MarketFeed } from "../../../lib/product-data";

export const dynamic = "force-dynamic";

async function saveFeed(
  feed: Awaited<ReturnType<typeof fetchPolymarketFeed>>,
) {
  const { getDb } = await import("../../../db");
  const db = getDb();
  await Promise.all(
    feed.markets.map((market) =>
      db
        .insert(sourcedMarkets)
        .values({
          ...market,
          status: "OPEN",
          fetchedAt: feed.fetchedAt,
          updatedAt: feed.fetchedAt,
        })
        .onConflictDoUpdate({
          target: sourcedMarkets.id,
          set: {
            slug: market.slug,
            question: market.question,
            description: market.description,
            category: market.category,
            status: "OPEN",
            endAt: market.endAt,
            sourceUrl: market.sourceUrl,
            volume24hr: market.volume24hr,
            fetchedAt: feed.fetchedAt,
            updatedAt: feed.fetchedAt,
          },
        }),
    ),
  );
}

async function cachedFeed(): Promise<MarketFeed | null> {
  const { getDb } = await import("../../../db");
  const rows = await getDb()
    .select()
    .from(sourcedMarkets)
    .where(gt(sourcedMarkets.endAt, new Date().toISOString()))
    .orderBy(desc(sourcedMarkets.volume24hr))
    .limit(30);
  if (!rows.length) return null;
  return {
    source: "Polymarket",
    stale: true,
    fetchedAt: rows[0].fetchedAt,
    markets: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      question: row.question,
      description: row.description,
      category: row.category as MarketCategory,
      endAt: row.endAt,
      sourceUrl: row.sourceUrl,
    })),
  };
}

export async function GET() {
  try {
    const feed = await fetchPolymarketFeed();
    try {
      await saveFeed(feed);
    } catch {
      // The live public feed remains usable while a new D1 migration settles.
    }
    return Response.json({
      source: "Polymarket",
      stale: false,
      fetchedAt: feed.fetchedAt,
      markets: feed.markets.map((market) => ({
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: market.description,
        category: market.category,
        endAt: market.endAt,
        sourceUrl: market.sourceUrl,
      })),
    } satisfies MarketFeed);
  } catch (error) {
    try {
      const cached = await cachedFeed();
      if (cached) return Response.json(cached);
    } catch {
      // Fall through to a clear upstream error.
    }
    const message = error instanceof Error ? error.message : "Market feed unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
