import type {
  MarketCategory,
  MarketResolutionReadiness,
  SourcedMarket,
} from "./product-data";

const GAMMA_MARKET_ROOT = "https://gamma-api.polymarket.com/markets";
const GAMMA_MARKETS_URL =
  `${GAMMA_MARKET_ROOT}?active=true&closed=false&limit=200&order=volume24hr&ascending=false&include_tag=true`;
const CACHE_MS = 60_000;

type CachedFeed = {
  expiresAt: number;
  fetchedAt: string;
  markets: InternalMarket[];
};

type InternalMarket = SourcedMarket & { volume24hr: number };

let memoryCache: CachedFeed | null = null;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, maximum = 2_000) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, maximum)
    : "";
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizedFinalPrice(value: unknown): "0" | "0.5" | "1" | null {
  const raw = String(value).trim();
  const normalized = raw.includes(".")
    ? raw.replace(/0+$/, "").replace(/\.$/, "")
    : raw;
  if (!normalized || normalized === "0") return "0";
  if (normalized === "0.5" || normalized === "1") return normalized;
  return null;
}

function tagLabels(market: Record<string, unknown>) {
  const labels: string[] = [];
  const collect = (values: unknown[]) => {
    for (const value of values) {
      const tag = record(value);
      const label = text(tag?.label ?? tag?.name ?? tag?.slug, 80);
      if (label) labels.push(label.toLowerCase());
    }
  };
  collect(array(market.tags));
  for (const value of array(market.events)) {
    const event = record(value);
    if (event) collect(array(event.tags));
  }
  return labels.join(" ");
}

function categoryFor(market: Record<string, unknown>): MarketCategory {
  const haystack = `${tagLabels(market)} ${text(market.question, 500)}`.toLowerCase();
  if (/sport|football|soccer|basketball|baseball|tennis|nba|nfl|nhl|mlb/.test(haystack)) return "Sports";
  if (/crypto|bitcoin|ethereum|solana|defi|blockchain/.test(haystack)) return "Crypto";
  if (/politic|election|president|congress|senate|parliament/.test(haystack)) return "Politics";
  if (/econom|fed|federal reserve|interest rate|inflation|gdp|recession/.test(haystack)) return "Economy";
  if (/technology|artificial intelligence|\bai\b|software|spacex/.test(haystack)) return "Technology";
  if (/science|space|climate|medicine|health/.test(haystack)) return "Science";
  if (/culture|film|movie|music|award|celebrity/.test(haystack)) return "Culture";
  if (/world|war|ceasefire|country|geopolit/.test(haystack)) return "World";
  return "Other";
}

function sourceSlug(market: Record<string, unknown>, fallback: string) {
  const firstEvent = record(array(market.events)[0]);
  return text(firstEvent?.slug, 200) || fallback;
}

function normalizeMarket(
  value: unknown,
  now: number,
): InternalMarket | null {
  const market = record(value);
  if (!market) return null;
  const id = text(market.id, 32);
  const slug = text(market.slug, 200).toLowerCase();
  const question = text(market.question, 500);
  const outcomes = array(market.outcomes).map((outcome) =>
    text(outcome, 20).toLowerCase(),
  );
  const end = new Date(text(market.endDate, 50));
  if (
    !/^\d{1,32}$/.test(id) ||
    !/^[a-z0-9-]+$/.test(slug) ||
    question.length < 5 ||
    outcomes.length !== 2 ||
    outcomes[0] !== "yes" ||
    outcomes[1] !== "no" ||
    market.active !== true ||
    market.closed === true ||
    market.acceptingOrders !== true ||
    Number.isNaN(end.getTime()) ||
    end.getTime() <= now + 15 * 60_000
  ) {
    return null;
  }

  const eventSlug = sourceSlug(market, slug);
  return {
    id,
    slug,
    question,
    description:
      text(market.description, 2_000) || "See the source for resolution rules.",
    category: categoryFor(market),
    endAt: end.toISOString(),
    sourceUrl: `https://polymarket.com/event/${eventSlug}`,
    volume24hr: Math.max(0, Math.round(Number(market.volume24hr) || 0)),
  };
}

export async function fetchPolymarketFeed() {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache;

  const response = await fetch(GAMMA_MARKETS_URL, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Polymarket feed returned HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) throw new Error("Polymarket feed was not a list.");

  const seen = new Set<string>();
  const markets = payload
    .map((value) => normalizeMarket(value, now))
    .filter((market): market is InternalMarket => {
      if (!market || seen.has(market.id)) return false;
      seen.add(market.id);
      return true;
    })
    .sort((a, b) => b.volume24hr - a.volume24hr)
    .slice(0, 30);
  if (!markets.length) throw new Error("No active binary markets were available.");

  memoryCache = {
    expiresAt: now + CACHE_MS,
    fetchedAt: new Date(now).toISOString(),
    markets,
  };
  return memoryCache;
}

export async function fetchPolymarketResolutionReadiness(
  marketId: string,
): Promise<MarketResolutionReadiness> {
  if (!/^\d{1,32}$/.test(marketId)) {
    throw new Error("A numeric Polymarket market ID is required.");
  }

  const response = await fetch(`${GAMMA_MARKET_ROOT}/${marketId}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Polymarket market lookup returned HTTP ${response.status}.`);
  }

  const market = record((await response.json()) as unknown);
  if (!market || text(market.id, 32) !== marketId) {
    throw new Error("Polymarket returned an unexpected market.");
  }

  const outcomes = array(market.outcomes).map((outcome) =>
    String(outcome).trim().toUpperCase(),
  );
  if (outcomes.length !== 2 || outcomes[0] !== "YES" || outcomes[1] !== "NO") {
    throw new Error("This Polymarket market is not binary Yes/No.");
  }

  const checkedAt = new Date().toISOString();
  if (market.closed !== true) {
    return {
      marketId,
      resolvable: false,
      outcome: null,
      reason: "SOURCE_OPEN",
      checkedAt,
    };
  }

  const prices = array(market.outcomePrices).map(normalizedFinalPrice);
  let outcome: MarketResolutionReadiness["outcome"] = null;
  if (prices[0] === "1" && prices[1] === "0") outcome = "YES";
  if (prices[0] === "0" && prices[1] === "1") outcome = "NO";
  if (prices[0] === "0.5" && prices[1] === "0.5") outcome = "VOID";

  return {
    marketId,
    resolvable: outcome !== null,
    outcome,
    reason: outcome === null ? "OUTCOME_PENDING" : "READY",
    checkedAt,
  };
}
