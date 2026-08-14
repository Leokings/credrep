import { desc, gt, lte, sql } from "drizzle-orm";
import { sourcedMarkets } from "../../../db/schema";
import { fetchPolymarketFeed } from "../../../lib/polymarket";
import type { MarketCategory, MarketFeed } from "../../../lib/product-data";
import { createRequestLogger } from "../../../lib/server-logging";

export const dynamic = "force-dynamic";

async function saveFeed(
  feed: Awaited<ReturnType<typeof fetchPolymarketFeed>>,
) {
  const { getDb } = await import("../../../db");
  const db = getDb();
  if (feed.markets.length) {
    await db
      .insert(sourcedMarkets)
      .values(
        feed.markets.map((market) => ({
          ...market,
          endAt: new Date(market.endAt),
          status: "OPEN",
          fetchedAt: new Date(feed.fetchedAt),
          updatedAt: new Date(feed.fetchedAt),
        })),
      )
      .onConflictDoUpdate({
        target: sourcedMarkets.id,
        set: {
          slug: sql`excluded.slug`,
          question: sql`excluded.question`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          status: sql`excluded.status`,
          endAt: sql`excluded.end_at`,
          sourceUrl: sql`excluded.source_url`,
          volume24hr: sql`excluded.volume_24hr`,
          fetchedAt: sql`excluded.fetched_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
  await db
    .delete(sourcedMarkets)
    .where(lte(sourcedMarkets.endAt, new Date()));
}

async function cachedFeed(): Promise<MarketFeed | null> {
  const { getDb } = await import("../../../db");
  const rows = await getDb()
    .select()
    .from(sourcedMarkets)
    .where(gt(sourcedMarkets.endAt, new Date()))
    .orderBy(desc(sourcedMarkets.volume24hr))
    .limit(30);
  if (!rows.length) return null;
  return {
    source: "Polymarket",
    stale: true,
    fetchedAt: rows[0].fetchedAt.toISOString(),
    markets: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      question: row.question,
      description: row.description,
      category: row.category as MarketCategory,
      endAt: row.endAt.toISOString(),
      sourceUrl: row.sourceUrl,
    })),
  };
}

export async function GET(request: Request) {
  const log = createRequestLogger(request, "/api/markets");
  try {
    const feed = await fetchPolymarketFeed();
    try {
      await saveFeed(feed);
    } catch (error) {
      console.warn("market_cache_write_failed", error);
      // The live public feed remains usable while Postgres is unavailable.
    }
    log.done(200, { markets: feed.markets.length, stale: false });
    return Response.json(
      {
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
      } satisfies MarketFeed,
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    try {
      const cached = await cachedFeed();
      if (cached) {
        log.done(200, { markets: cached.markets.length, stale: true });
        return Response.json(cached, {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
          },
        });
      }
    } catch (cacheError) {
      log.failed(cacheError, 502, { upstreamFailed: true });
      // Fall through to a clear upstream error.
    }
    log.failed(error, 502);
    return Response.json(
      { error: "Market feed is temporarily unavailable." },
      { status: 502 },
    );
  }
}
