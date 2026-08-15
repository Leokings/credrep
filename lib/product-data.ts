export type MarketCategory =
  | "Politics"
  | "Economy"
  | "Sports"
  | "Crypto"
  | "Technology"
  | "Science"
  | "Culture"
  | "World"
  | "Other";

export type SourcedMarket = {
  id: string;
  slug: string;
  question: string;
  description: string;
  category: MarketCategory;
  endAt: string;
  sourceUrl: string;
};

export type MarketFeed = {
  markets: SourcedMarket[];
  fetchedAt: string;
  stale: boolean;
  source: "Polymarket";
};

export type MarketResolutionReadiness = {
  marketId: string;
  resolvable: boolean;
  outcome: "YES" | "NO" | "VOID" | null;
  reason: "SOURCE_OPEN" | "OUTCOME_PENDING" | "READY";
  checkedAt: string;
};
